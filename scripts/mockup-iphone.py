"""Places an app screenshot inside a drawn iPhone frame and renders a PNG (for the website hero).
usage: python scripts/mockup-iphone.py <screenshot.png> <out.png> [--bg white|black|none]
The frame is drawn in CSS (no third-party device art), titanium edge + Dynamic Island, at 3x.
"""
import base64, pathlib, subprocess, sys, tempfile

shot, out = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve()
bg = sys.argv[sys.argv.index("--bg") + 1] if "--bg" in sys.argv else "white"
b64 = base64.b64encode(shot.read_bytes()).decode()
page_bg = {"white": "#ffffff", "black": "#0a0a0b", "none": "transparent"}[bg]

html = f"""<!doctype html><meta charset=utf-8><style>
html,body{{margin:0;background:{page_bg};}}
.stage{{width:520px;height:1010px;display:grid;place-items:center;}}
.phone{{position:relative;width:430px;height:932px;border-radius:68px;padding:14px;box-sizing:border-box;
  background:linear-gradient(145deg,#d9d9de 0%,#8e8e93 18%,#c7c7cc 40%,#6e6e73 62%,#b0b0b5 82%,#e5e5ea 100%);
  box-shadow:0 40px 80px rgba(10,10,11,.18),0 8px 24px rgba(10,10,11,.12),inset 0 0 0 1px rgba(255,255,255,.5);}}
.bezel{{position:absolute;inset:4px;border-radius:64px;background:#0a0a0b;}}
.screen{{position:relative;width:100%;height:100%;border-radius:55px;overflow:hidden;background:#fff;}}
.screen img{{width:100%;height:100%;object-fit:cover;object-position:top;display:block;}}
.island{{position:absolute;top:11px;left:50%;width:122px;height:36px;margin-left:-61px;border-radius:20px;background:#0a0a0b;z-index:2;}}
.btn{{position:absolute;width:4px;border-radius:2px;background:linear-gradient(90deg,#7c7c80,#c7c7cc);}}
.glare{{position:absolute;inset:0;border-radius:55px;pointer-events:none;
  background:linear-gradient(115deg,rgba(255,255,255,.10) 0%,rgba(255,255,255,0) 32%);}}
</style>
<div class=stage><div class=phone>
  <div class=btn style="left:-4px;top:180px;height:34px"></div>
  <div class=btn style="left:-4px;top:240px;height:64px"></div>
  <div class=btn style="left:-4px;top:316px;height:64px"></div>
  <div class=btn style="right:-4px;top:262px;height:100px"></div>
  <div class=bezel></div>
  <div class=screen><img src="data:image/png;base64,{b64}"><div class=island></div><div class=glare></div></div>
</div></div>"""

with tempfile.TemporaryDirectory() as tmp:
    page = pathlib.Path(tmp, "mock.html")
    page.write_text(html, encoding="utf-8")
    chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    args = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=3",
            "--window-size=520,1010", f"--screenshot={out}", page.as_uri()]
    if bg == "none":
        args.insert(3, "--default-background-color=00000000")
    subprocess.run(args, check=True, capture_output=True)
print(out)
