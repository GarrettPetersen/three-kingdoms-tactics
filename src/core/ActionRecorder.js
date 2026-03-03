/**
 * Records the next user action (e.g. one dialogue advance, one attack) as video.
 * Video is from the game canvas only (256x256, no letterboxing or UI). Audio is from
 * the tab/window (voice + SFX; music is muted during record). Arm with hotkey/button
 * (getDisplayMedia needs user gesture for audio).
 */

const RECORD_MIME = 'video/webm;codecs=vp9,opus';
const FALLBACK_MIME = 'video/webm';
const CAPTURE_FPS = 30;

export class ActionRecorder {
    constructor(assets, canvas = null) {
        this.assets = assets;
        this.canvas = canvas;
        this.stream = null;
        this.armed = false;
        this.recording = false;
        this.mediaRecorder = null;
        this.chunks = [];
        this.savedMusicVolume = 0.5;
        this.clipIndex = 0;
        this.onArmedChange = null; // (armed: boolean) => void for UI
        this.onRecordingChange = null; // (recording: boolean) => void for UI
        this.onClipSaved = null; // (filename: string) => void for UI (e.g. show "Saved …" and where it went)
        this.lastError = null; // set when arm() fails, for UI to show
    }

    async arm() {
        this.lastError = null;
        if (this.recording) return false;
        if (!window.isSecureContext) {
            this.lastError = 'Screen capture requires HTTPS or localhost.';
            return false;
        }
        if (!navigator.mediaDevices?.getDisplayMedia) {
            this.lastError = 'Screen capture not available in this browser.';
            return false;
        }
        try {
            if (this.stream) {
                this.stream.getTracks().forEach(t => t.stop());
                this.stream = null;
            }
            // preferCurrentTab hints the browser to highlight this tab; if it's not listed, share the whole window
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
                preferCurrentTab: true
            });
            this.stream.getVideoTracks()[0].onended = () => {
                this.armed = false;
                this.stream = null;
                if (this.onArmedChange) this.onArmedChange(false);
            };
            this.armed = true;
            if (this.onArmedChange) this.onArmedChange(true);
            return true;
        } catch (e) {
            console.warn('ActionRecorder: getDisplayMedia failed', e.name, e.message);
            if (e.name === 'NotSupportedError' || e.message === 'Not supported') {
                const isSafari = /Safari\//.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);
                this.lastError = isSafari
                    ? 'Safari doesn’t support screen capture. Use Chrome or Edge to record.'
                    : 'Screen capture not available. Try Chrome or Edge.';
            } else {
                this.lastError = e.message || 'Screen capture failed.';
            }
            return false;
        }
    }

    onUserActionStart() {
        if (!this.armed || !this.stream || this.recording) return false;
        this.armed = false;
        if (this.onArmedChange) this.onArmedChange(false);

        this.savedMusicVolume = this.assets.baseMusicVolume ?? 0.5;
        this.assets.setMusicVolume(0);
        this.chunks = [];

        // Video from canvas only (game content, no letterboxing or record panel); audio from tab
        const audioTracks = this.stream.getAudioTracks();
        const videoTrack = this.canvas
            ? this.canvas.captureStream(CAPTURE_FPS).getVideoTracks()[0]
            : this.stream.getVideoTracks()[0];
        const combinedStream = new MediaStream(
            videoTrack ? [videoTrack, ...audioTracks] : [...audioTracks]
        );
        if (!combinedStream.getVideoTracks().length) {
            combinedStream.addTrack(this.stream.getVideoTracks()[0]);
        }

        const mimeType = MediaRecorder.isTypeSupported(RECORD_MIME) ? RECORD_MIME : FALLBACK_MIME;
        this._currentStream = combinedStream; // so we can stop canvas/tab tracks when done
        this.mediaRecorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 5e6, audioBitsPerSecond: 128000 });
        this.mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) this.chunks.push(e.data);
        };
        this.mediaRecorder.onstop = () => {
            if (this._currentStream) {
                this._currentStream.getTracks().forEach(t => t.stop());
                this._currentStream = null;
            }
            this.assets.setMusicVolume(this.savedMusicVolume);
            this.recording = false;
            if (this.onRecordingChange) this.onRecordingChange(false);
            if (this.chunks.length === 0) return;
            this.clipIndex += 1;
            const filename = `trailer_clip_${String(this.clipIndex).padStart(3, '0')}.webm`;
            const blob = new Blob(this.chunks, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            if (this.onClipSaved) this.onClipSaved(filename);
        };
        this.mediaRecorder.start(100);
        this.recording = true;
        if (this.onRecordingChange) this.onRecordingChange(true);
        // Safety: stop after 90s if no end signal (e.g. voice failed, or step had no voice/duration)
        this._safetyTimeout = setTimeout(() => {
            if (this.recording && this.mediaRecorder?.state === 'recording') {
                this.signalActionEnd();
            }
        }, 90000);
        return true;
    }

    signalActionEnd() {
        if (this._safetyTimeout) {
            clearTimeout(this._safetyTimeout);
            this._safetyTimeout = null;
        }
        if (!this.recording || !this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
    }
}
