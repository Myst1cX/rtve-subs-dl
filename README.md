# RTVE Subtitle Downloader (VTT FORMAT)
A userscript that downloads the last selected RTVE subtitle track, in the original VTT format.
FUTURE: Will try to make live subtitles also be downloadable (since in some cases, their location is disclosed as separate vtt in master playlist, it could be technically possible to parse all of them into a single vtt)

<img width="500" height="387" alt="image" src="https://github.com/user-attachments/assets/0e713cd9-9df4-4d86-bf26-dafa06f49e59" /> 
<img width="500" height="387" alt="image" src="https://github.com/user-attachments/assets/a487bfb7-4ee2-4106-a134-1a242698eb2e" />

## USAGE

> You must first select the subtitle track before attempting to download it.   
> Why? Because that is how we get RTVE to send a network request to fetch the subtitles.   
> Only then are those subtitles discoverable by the userscript.    
> Note that the subtitle downloaded is always from the last selected subtitle track.   

## LICENSE

> This project is licensed under the [GNU General Public License v2.0](https://github.com/Myst1cX/rtve-subs-dl/blob/main/LICENSE).
