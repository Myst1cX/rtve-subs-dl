// ==UserScript==
// @name         RTVE Subtitle Downloader (VTT format)
// @namespace    https://github.com/Myst1cX/rtve-subs-dl
// @version      4.5
// @description  Downloads the last selected RTVE subtitle track, in the original VTT format
// @author       Myst1cX
// @match        https://www.rtve.es/*
// @run-at       document-idle
// @grant        none
// @homepageURL  https://github.com/Myst1cX/rtve-subs-dl
// @supportURL   https://github.com/Myst1cX/rtve-subs-dl/issues
// @updateURL    https://raw.githubusercontent.com/Myst1cX/rtve-subs-dl/main/rtve-subs-dl.js
// @downloadURL  https://raw.githubusercontent.com/Myst1cX/rtve-subs-dl/main/rtve-subs-dl.js
// ==/UserScript==

//  You must first select the subtitle track before attempting to download it.  
//  Why? Because that is how we get RTVE to send a network request to fetch the subtitles.   
//  Only then are those subtitles discoverable by the userscript.  
//  Note that the subtitle downloaded is always from the last selected subtitle track.  

(function () {
    'use strict';

    function getLatestVTT() {
        const entries = performance.getEntriesByType("resource");
        for (let i = entries.length - 1; i >= 0; i--) {
            if (entries[i].name.includes(".vtt")) {
                return entries[i].name;
            }
        }
        return null;
    }

    function download(url, filename) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    function createButton() {
        const btn = document.createElement("span");

        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="19" height="19" fill="white" style="vertical-align: text-bottom;">
                <path d="M12 16l4-5h-3V4h-2v7H8l4 5zm-7 2h14v2H5z"/>
            </svg>
        `;

        btn.style.display = "inline-flex";
        btn.style.alignItems = "center";
        btn.style.width = "auto";      // shrink to icon
        btn.style.flexShrink = "0";
        btn.style.marginLeft = "6px";  // spacing from text
        btn.style.opacity = "0.75";
        btn.style.cursor = "pointer";
        btn.style.userSelect = "none";
        btn.style.pointerEvents = "auto";
        btn.style.transition = "opacity 0.15s ease";

        btn.onmouseenter = () => btn.style.opacity = "1";
        btn.onmouseleave = () => btn.style.opacity = "0.75";

        return btn;
    }

    function injectIntoMenu(menu) {
        const items = menu.querySelectorAll(
            ".theo-text-track-menu-item.vjs-menu-item.theo-menu-item"
        );

        items.forEach(item => {
            if (item.querySelector(".rtve-download-btn")) return;

            const span = item.querySelector("span");
            if (!span) return;

            // keep label + (ES) inline
            span.style.display = "inline-flex";
            span.style.alignItems = "center";
            span.style.flexWrap = "nowrap";

            const btn = createButton();
            btn.className = "rtve-download-btn";

            btn.onclick = (e) => {
                e.stopPropagation();

                const url = getLatestVTT();
                if (!url) {
                    alert("You need to select a subtitle track before downloading.");
                    return;
                }

                const label = span.textContent.trim();
                download(url, label + ".vtt");
            };

            // append button after text so it stays inline
            span.appendChild(btn);
        });
    }

    const observer = new MutationObserver(() => {
        const menus = document.querySelectorAll(".theo-menu-content.vjs-menu-content");
        menus.forEach(menu => injectIntoMenu(menu));
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();
