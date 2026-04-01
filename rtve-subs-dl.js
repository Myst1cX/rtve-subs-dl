// ==UserScript==
// @name         RTVE Subtitle Downloader (Live & VOD)
// @namespace    https://github.com/Myst1cX/rtve-subs-dl
// @version      5.0
// @description  Downloads RTVE subtitle tracks (VOD or Live DVR) in VTT format
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

    // Maps language labels shown in the RTVE player UI to the 2-letter codes
    // used in RTVE's live DVR subtitle playlist filenames (e.g. la1_main_dvr_es.m3u8).
    const LANG_MAP = {
        // Spanish
        'español': 'es', 'spanish': 'es', 'castellano': 'es', '(es)': 'es',
        // Catalan
        'català': 'ca', 'catalan': 'ca', 'valenciana': 'ca', '(ca)': 'ca',
        // Galician
        'galego': 'gl', 'galician': 'gl', '(gl)': 'gl',
        // Basque
        'euskera': 'eu', 'basque': 'eu', '(eu)': 'eu',
        // English
        'english': 'en', 'inglés': 'en', '(en)': 'en',
        // French
        'français': 'fr', 'french': 'fr', 'francés': 'fr', '(fr)': 'fr',
        // Portuguese
        'português': 'pt', 'portuguese': 'pt', 'portugués': 'pt', '(pt)': 'pt',
    };

    /**
     * Derives a 2-letter language code from the subtitle menu item label.
     * Tries an exact map lookup first, then looks for a parenthesised tag like "(ES)".
     */
    function getLangCode(label) {
        const lower = label.toLowerCase().trim();

        // Direct match against the whole label or any whitespace-separated token
        for (const token of lower.split(/\s+/)) {
            if (LANG_MAP[token]) return LANG_MAP[token];
        }

        // Parenthesised tag anywhere in the label: "(ES)", "(CA)", …
        const tagMatch = lower.match(/\(([a-z]{2})\)/);
        if (tagMatch) return tagMatch[1];

        return null;
    }

    /**
     * Scans performance resource entries for a subtitle source matching the
     * clicked track's language.
     *
     * Priority:
     *   1. Live DVR playlist  – URL contains `_main_dvr_[langCode].m3u8`
     *   2. Static VOD file    – URL ends with `.vtt` (fallback)
     */
    function getLatestSubtitleUrl(langCode) {
        const entries = performance.getEntriesByType("resource");
        let fallbackVtt = null;

        for (let i = entries.length - 1; i >= 0; i--) {
            const url = entries[i].name;

            // Live DVR subtitle playlist: must end with _<langCode>.m3u8
            if (langCode && url.includes(`_main_dvr_${langCode}.m3u8`)) {
                return { url, type: 'live' };
            }

            // Static VOD subtitle file
            if (!fallbackVtt && url.endsWith('.vtt')) {
                fallbackVtt = url;
            }
        }

        return fallbackVtt ? { url: fallbackVtt, type: 'static' } : null;
    }

    /**
     * Fetches an HLS subtitle playlist (.m3u8), extracts every .vtt chunk URL,
     * fetches them all in parallel, strips duplicate WEBVTT headers, and returns
     * a blob: URL pointing at the merged single-file VTT.
     */
    async function fetchAndMergeLiveSubs(playlistUrl) {
        const playlistResp = await fetch(playlistUrl);
        if (!playlistResp.ok) throw new Error(`Playlist fetch failed: ${playlistResp.status}`);
        const playlistText = await playlistResp.text();

        const baseUrl = playlistUrl.substring(0, playlistUrl.lastIndexOf('/') + 1);
        const vttUrls = playlistText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.endsWith('.vtt'))
            .map(line => (line.startsWith('http') ? line : baseUrl + line));

        if (vttUrls.length === 0) {
            throw new Error("No subtitle chunks found in the live playlist.");
        }

        console.log(`[RTVE-DL] Fetching ${vttUrls.length} subtitle segments…`);

        const chunks = await Promise.all(
            vttUrls.map(u =>
                fetch(u)
                    .then(r => {
                        if (!r.ok) throw new Error(`Segment fetch failed (${r.status}): ${u}`);
                        return r.text();
                    })
            )
        );

        let merged = "WEBVTT\n";
        chunks.forEach(content => {
            // Strip leading WEBVTT header (and any trailing blank lines after it)
            const body = content.replace(/^WEBVTT[^\n]*\n+/i, '').trimEnd();
            if (body) merged += '\n' + body + '\n';
        });

        return URL.createObjectURL(new Blob([merged], { type: 'text/vtt' }));
    }

    function download(url, filename) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (url.startsWith('blob:')) {
            // Give the browser enough time to start the download before releasing the blob URL.
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
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

            btn.onclick = async (e) => {
                e.stopPropagation();

                const label = span.textContent.trim();
                const langCode = getLangCode(label);
                const track = getLatestSubtitleUrl(langCode);

                if (!track) {
                    alert("You need to select a subtitle track before downloading.");
                    return;
                }

                btn.style.opacity = "0.3";

                try {
                    if (track.type === 'live') {
                        const blobUrl = await fetchAndMergeLiveSubs(track.url);
                        download(blobUrl, `${label}_LIVE.vtt`);
                    } else {
                        download(track.url, `${label}.vtt`);
                    }
                } catch (err) {
                    console.error("[RTVE-DL]", err);
                    alert("Error downloading subtitles: " + err.message);
                } finally {
                    btn.style.opacity = "0.75";
                }
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
