const path = require('path');
const fs = require('fs');
const { contextBridge } = require('electron');

function makeNoopSteamInput(reason = 'Steam Input unavailable') {
    return {
        isAvailable: () => false,
        getReason: () => reason,
        poll: () => ({
            up: false,
            down: false,
            left: false,
            right: false,
            confirm: false,
            cancel: false
        })
    };
}

function createSteamInputBridge() {
    try {
        // Optional dependency. If not installed or Steam isn't running, we gracefully no-op.
        // eslint-disable-next-line global-require
        const steamworks = require('steamworks.js');
        const envAppId =
            process.env.STEAM_APP_ID ||
            process.env.STEAMWORKS_APP_ID ||
            process.env.SteamAppId ||
            process.env.STEAM_APPID ||
            '';
        const appId = Number(envAppId || 480);
        const client = steamworks.init(appId);
        const input = client && (client.input || client.steamInput || null);
        if (!input) {
            return makeNoopSteamInput('Steamworks initialized without input interface');
        }

        // Best-effort action manifest hookup. Some wrappers expose this, some don't.
        // Try dev path, packaged extraResources path, and cwd fallback.
        const manifestCandidates = [
            path.join(__dirname, 'steam_input', 'actions.json'),
            process.resourcesPath ? path.join(process.resourcesPath, 'steam_input', 'actions.json') : '',
            path.join(process.cwd(), 'steam_input', 'actions.json')
        ].filter(Boolean);
        const manifestPath = manifestCandidates.find(p => {
            try {
                return fs.existsSync(p);
            } catch (_) {
                return false;
            }
        }) || null;
        const setManifest =
            input.setInputActionManifestFilePath ||
            input.setActionManifestPath ||
            input.setActionManifestFilePath;
        let manifestStatus = 'not-set';
        if (typeof setManifest === 'function') {
            if (manifestPath) {
                try {
                    setManifest.call(input, manifestPath);
                    manifestStatus = `set:${manifestPath}`;
                } catch (_) {
                    manifestStatus = `set-failed:${manifestPath}`;
                    // Non-fatal: Steam Input can still work via Steam's gamepad emulation.
                }
            } else {
                manifestStatus = 'manifest-not-found';
            }
        } else {
            manifestStatus = 'setter-unavailable';
        }

        const fn = {
            runFrame: input.runFrame || input.RunFrame,
            getConnectedControllers: input.getConnectedControllers || input.GetConnectedControllers,
            getActionSetHandle: input.getActionSetHandle || input.GetActionSetHandle,
            activateActionSet: input.activateActionSet || input.ActivateActionSet,
            getDigitalActionHandle: input.getDigitalActionHandle || input.GetDigitalActionHandle,
            getDigitalActionData: input.getDigitalActionData || input.GetDigitalActionData
        };

        // We expose just the keys the game uses.
        const ACTION_SET = 'gameplay';
        const DIGITAL_NAMES = {
            up: 'up',
            down: 'down',
            left: 'left',
            right: 'right',
            confirm: 'confirm',
            cancel: 'cancel'
        };

        let actionSetHandle = null;
        const digitalHandles = {};
        let handlesReady = false;

        const ensureHandles = () => {
            if (handlesReady) return;
            if (typeof fn.getActionSetHandle === 'function') {
                actionSetHandle = fn.getActionSetHandle.call(input, ACTION_SET);
            }
            if (typeof fn.getDigitalActionHandle === 'function') {
                Object.entries(DIGITAL_NAMES).forEach(([key, name]) => {
                    digitalHandles[key] = fn.getDigitalActionHandle.call(input, name);
                });
            }
            handlesReady = true;
        };

        const extractPressed = (data) => {
            if (!data) return false;
            if (typeof data.bState === 'boolean') return data.bState;
            if (typeof data.state === 'boolean') return data.state;
            if (typeof data.pressed === 'boolean') return data.pressed;
            return false;
        };

        return {
            isAvailable: () => true,
            getReason: () => `Steam Input bridge active (appId=${appId}, manifest=${manifestStatus})`,
            poll: () => {
                try {
                    if (typeof fn.runFrame === 'function') fn.runFrame.call(input);
                    if (typeof fn.getConnectedControllers !== 'function') {
                        return { up: false, down: false, left: false, right: false, confirm: false, cancel: false };
                    }

                    const controllers = fn.getConnectedControllers.call(input) || [];
                    const handle = Array.isArray(controllers) && controllers.length > 0 ? controllers[0] : null;
                    if (!handle) {
                        return { up: false, down: false, left: false, right: false, confirm: false, cancel: false };
                    }

                    ensureHandles();
                    if (actionSetHandle && typeof fn.activateActionSet === 'function') {
                        fn.activateActionSet.call(input, handle, actionSetHandle);
                    }
                    if (typeof fn.getDigitalActionData !== 'function') {
                        return { up: false, down: false, left: false, right: false, confirm: false, cancel: false };
                    }

                    return {
                        up: extractPressed(fn.getDigitalActionData.call(input, handle, digitalHandles.up)),
                        down: extractPressed(fn.getDigitalActionData.call(input, handle, digitalHandles.down)),
                        left: extractPressed(fn.getDigitalActionData.call(input, handle, digitalHandles.left)),
                        right: extractPressed(fn.getDigitalActionData.call(input, handle, digitalHandles.right)),
                        confirm: extractPressed(fn.getDigitalActionData.call(input, handle, digitalHandles.confirm)),
                        cancel: extractPressed(fn.getDigitalActionData.call(input, handle, digitalHandles.cancel))
                    };
                } catch (_) {
                    return { up: false, down: false, left: false, right: false, confirm: false, cancel: false };
                }
            }
        };
    } catch (err) {
        return makeNoopSteamInput(err?.message || 'Steamworks unavailable');
    }
}

contextBridge.exposeInMainWorld('steamInput', createSteamInputBridge());

window.addEventListener('DOMContentLoaded', () => {
    const available = !!(window.steamInput && window.steamInput.isAvailable && window.steamInput.isAvailable());
    const reason = window.steamInput && window.steamInput.getReason ? window.steamInput.getReason() : 'unknown';
    console.log(`Electron environment initialized (Steam Input: ${available ? 'on' : 'off'} - ${reason})`);
});


