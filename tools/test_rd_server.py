import os
import asyncio
import websockets
import shutil

# --- Configuration ---
RD_SERVER_URL = "ws://localhost:8765"
# Retro Diffusion extension path
RD_EXTENSION_PATH = os.path.expanduser("~/Library/Application Support/Aseprite/extensions/RetroDiffusion")
TEMP_DIR = os.path.join(RD_EXTENSION_PATH, "stable-diffusion-aseprite", "temp")

async def test_gen():
    # 1. Prepare input image
    input_src = "assets/portraits/snes_raw/Ahuinan-generic.png"
    if not os.path.exists(input_src):
        print(f"Error: {input_src} not found.")
        return

    os.makedirs(TEMP_DIR, exist_ok=True)
    shutil.copy(input_src, os.path.join(TEMP_DIR, "input.png"))
    print(f"Copied {input_src} to {TEMP_DIR}/input.png")

    # 2. Load the safetensors model
    load_cmd = (
        "load"
        "{ddevice}mps"
        "{doptimized}true"
        "{dprecision}autocast"
        "{dpath}/Users/garrettpetersen/Image Gen Models/"
        "{dmodel}RetroDiffusion24x-64xModel.safetensors"
        "{end}"
    )

    # 3. Prepare img2img command with EXACT keys and order from server code
    img2img_params = [
        ("dlorapath", "/Users/garrettpetersen/Image Gen Models/"),
        ("dlorafiles", "none"),
        ("dloraweights", "0"),
        ("ddevice", "mps"),
        ("dprecision", "autocast"),
        ("dpixelsize", "8"),
        ("dmaxbatchsize", "64"),
        ("dprompt", "detailed pixel art portrait of Ahuinan, high quality, pixel art"),
        ("dnegative", "muted, dull, blurry, photographic"),
        ("dtranslate", "false"),
        ("dprompttuning", "true"),
        ("dwidth", "320"),
        ("dheight", "384"),
        ("dstep", "20"),
        ("dscale", "7.0"),
        ("dstrength", "60"),
        ("dseed", "12345"),
        ("diter", "1"),
        ("dtilingx", "false"),
        ("dtilingy", "false"),
        ("dpixelvae", "true"),
        ("dpalettize", "none")
    ]
    
    img2img_cmd = "img2img"
    for k, v in img2img_params:
        img2img_cmd += f"{{{k}}}{v}"
    img2img_cmd += "{end}"

    print(f"Connecting to {RD_SERVER_URL}...")
    try:
        async with websockets.connect(RD_SERVER_URL, ping_interval=None) as websocket:
            print("Sending load command...")
            await websocket.send(load_cmd)
            while True:
                resp = await websocket.recv()
                print(f"Server (load): {resp}")
                if resp == "loaded model":
                    break
                elif "error" in resp:
                    print("Failed to load model.")
                    return

            print("Sending img2img command...")
            await websocket.send(img2img_cmd)
            while True:
                resp = await websocket.recv()
                # Print progress if available
                if "%" in resp:
                    print(f"Progress: {resp}", end="\r")
                else:
                    print(f"Server (gen): {resp}")
                
                if resp == "returning img2img":
                    print("\nGeneration complete!")
                    result_path = os.path.join(TEMP_DIR, "temp1.png")
                    if os.path.exists(result_path):
                        shutil.copy(result_path, "test_output.png")
                        print("SUCCESS! Saved result to test_output.png")
                    break
                elif "error" in resp:
                    print("\nGeneration failed.")
                    break
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(test_gen())
