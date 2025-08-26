// src/modules/audioPlayer.js
// Lightweight audio player with a single HTMLAudioElement, small playlist,
// and an event emitter. No autoplay; playback only starts when play/toggle()
// is called (typically from a user gesture)

export function createAudioPlayer({
    playlist = [],
    volume = 1.0,
    preload = "metadata", // 'none' | 'metadata' | 'auto'
    loopAll = true // when a track ends, advance to next (wrap)
} = {}) {
    // Normalize playlist entries to objects { src, id?, title? }
    let tracks = (playlist || []).map((t, i) => 
        typeof t === "string" ? { src: t, id: `t${i}` } : t
    );

    // --- Internal state
    const audio = new Audio();
    audio.preload = preload;
    audio.volume = volume;
    audio.crossOrigin = "anonymous";

    let current = 0;
    let isPlaying = false;

    // --- Simple emitter
    const listeners = new Map();
    function on(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
        return () => off(type, fn);
    }
    function off(type, fn) {
        const set = listeners.get(type);
        if (set) set.delete(fn);
    }
    function emit(type, detail) {
        const set = listeners.get(type);
        if (!set) return;
        for (const fn of set) {
            try { fn(detail)} catch { /* no-op */ }
        }
    }

    // --- Track management
    function hasTracks() { return tracks.length > 0; }
    function clampIndex(i) {
        if (!hasTracks()) return 0;
        return (i % tracks.length + tracks.length) % tracks.length;
    }
    function setTrack(index, { silent = false } = {}) {
        if(!hasTracks()) return;
        current = clampIndex(index);
        const tr = tracks[current];
        if (!tr?.src) return;

        audio.src = tr.src;
        if (preload !== "none") audio.load();

        if (!silent) {
            emit("trackchange", { index: current, track: tr });
        }
    }

    // --- Playback controls
    async function play() {
        if (!hasTracks()) return;
        if (!audio.src) setTrack(current); // lazily set the first src

        try {
            await audio.play(); // Only called by user gestures in our app flow
            // 'play' event will set isPlaying and emit 'playing'
        } catch (err) {
            emit("error", { error: err, index: current, track: tracks[current] });
        }
    }

    function pause() {
        audio.pause();
    }

    function toggle() {
        return isPlaying ? pause() : play();
    }

    function next() {
        if (!hasTracks()) return;
        const wasPlaying = isPlaying;
        setTrack(current + 1);
        if (wasPlaying) play();
    }

    function prev() {
        if (!hasTracks()) return;
        const wasPlaying = isPlaying;
        setTrack(current - 1);
        if (wasPlaying) play();
    }

    // Volume
    function setVolume(v) {
        audio.volume = Math.max(0, Math.min(1, v));
        emit("volume", { volume: audio.volume });
    }

    // --- Replace playlist at runtime (keeps current index if possible)
    function setPlaylist(newList = [], startIndex = 0) {
        tracks = newList.map((t, i) => (typeof t === "string" ? { src: t, id: `t${i}` } : t));
        current = clampIndex(startIndex);
        isPlaying = false;
        audio.removeAttribute("src");
        audio.load();
        emit("playlistchange", { playlist: tracks, index: current });
    }

    // --- Audio element events
    audio.addEventListener("play", () => {
        isPlaying = true;
        emit("playing", { index: current, track: tracks[current] });
    });

    audio.addEventListener("pause", () => {
        isPlaying = false;
        emit("paused", { index: current, track: tracks[current] });
    });

    audio.addEventListener("ended", () => {
        emit("ended", { index: current, track: tracks[current] });
        if (loopAll) next();
    });

    audio.addEventListener("loadedmetadata", () => {
        emit("loadedmetadata", { index: current, track: tracks[current], duration: audio.duration });
    });

    audio.addEventListener("error", () => {
        emit("error", { index: current, track: tracks[current], error: audio.error });
    });

    // Don’t autoplay. Set initial src, but emit trackchange on a microtask
    // so subscribers added right after construction still catch it.
    if (tracks.length) {
        setTrack(0, { silent: true });
        queueMicrotask(() => {
            emit("trackchange", { index: current, track: tracks[current] });
        });
    }

    // --- Public API
    return {
        on, off,
        play, pause, toggle, next, prev,
        setVolume, setPlaylist,
        getState: () => ({
            isPlaying,
            index: current,
            track: tracks[current],
            volume: audio.volume,
            canPlay: !!tracks.length
        }),
        getCurrentTrack: () => tracks[current],
        getAudioEl: () => audio,
        destroy() {
            audio.pause();
            audio.removeAttribute("src");
            listeners.clear();
        }
    }
}
