At the end of every response, add one simple horizontal summary that shows the full flow of the answer.



Sumarize by using this exact format:
Rules:
- Keep it simple.
- Summarize only the important parts of the response.
- Keep the order exactly as the real workflow.
- Use `→` between every step.
- Include commands when they are important.
- Use short phrases, not explanations.
- The goal is that I can understand the entire response just by reading this one horizontal line.
- Always put this summary at the very end of the response.

```
<div style="overflow-x: auto; white-space: pre; border: 1px solid #ccc; padding: 10px; height:150px">
install Python with `winget`      →      winget install Python.Python.3.13      →      check Python      →      python --version      →      check pip      →      pip --version      →      install dependency      →      python -m pip install -U "yt-dlp[default]"      →      run program      →      python download_playlist.py
</div>

```




<div style="overflow-x: auto; white-space: pre; border: 1px solid #ccc; padding: 10px; height:150px">
install Python      →      winget install Python.Python.3.13      →      reopen PowerShell      →      check Python      →      python --version      →      check Python path if needed      →      where.exe python      →      disable Microsoft Store Python aliases if needed      →      install yt-dlp      →      python -m pip install -U "yt-dlp[default]"      →      check yt-dlp      →      python -m yt_dlp --version      →      install FFmpeg      →      winget install --id Gyan.FFmpeg      →      check FFmpeg      →      ffmpeg -version      →      install Deno      →      winget install DenoLand.Deno      →      check Deno      →      deno --version      →      go to script folder      →      cd "C:\Users\Admin\Documents\Obsidian\Videos\Java fresher"      →      run downloader      →      python download_playlist.py
</div>


<div style="overflow-x: auto; white-space: pre; border: 1px solid #ccc; padding: 10px; height:150px">
Windows cannot run `download_playlist.py` because Python is missing      →      install Python with `winget install Python.Python.3.13`      →      reopen PowerShell so Windows refreshes PATH      →      verify Python with `python --version`      →      if Windows still opens Microsoft Store, check `where.exe python` and disable `python.exe` / `python3.exe` App Execution Aliases      →      script imports `yt_dlp`, so install it with `python -m pip install -U "yt-dlp[default]"`      →      verify yt-dlp with `python -m yt_dlp --version`      →      YouTube may download video and audio separately, so install FFmpeg with `winget install --id Gyan.FFmpeg`      →      verify FFmpeg with `ffmpeg -version`      →      script uses Deno for YouTube JavaScript challenges, so install it with `winget install DenoLand.Deno`      →      verify Deno with `deno --version`      →      go to the folder containing the script with `cd "C:\Users\Admin\Documents\Obsidian\Videos\Java fresher"`      →      verify Python + yt-dlp + FFmpeg + Deno are working      →      run the downloader with `python download_playlist.py`
</div>



