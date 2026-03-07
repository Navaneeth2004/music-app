import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  PanResponder, type LayoutChangeEvent,
} from 'react-native';
import { Colors, Spacing, Radius } from '../../constants/theme';

interface Props {
  uri: string;
  accentColor?: string;
}

type Status = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export const AudioPlayer: React.FC<Props> = ({ uri, accentColor = Colors.accent }) => {
  const soundRef      = useRef<any>(null);
  const [status, setStatus]     = useState<Status>('idle');
  const [progress, setProgress] = useState(0);   // 0–1, display only
  const [duration, setDuration] = useState(0);   // ms
  const [position, setPosition] = useState(0);   // ms

  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackXRef     = useRef(0);   // absolute page-X of track left edge
  const trackWRef     = useRef(1);   // track width in px
  const durationRef   = useRef(0);   // mirror of duration state, readable in closures
  const scrubbingRef  = useRef(false);
  const pendingSeekRef = useRef<number | null>(null); // last seek target (ms), flushed on release

  // Keep durationRef in sync
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(intervalRef.current ?? undefined);
    soundRef.current?.unloadAsync().catch(() => {});
  }, []);

  // Reset when URI changes
  useEffect(() => { stopAndUnload(); }, [uri]);

  const stopAndUnload = async () => {
    clearInterval(intervalRef.current ?? undefined);
    if (soundRef.current) {
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setStatus('idle');
    setProgress(0);
    setPosition(0);
    setDuration(0);
    durationRef.current = 0;
  };

  // ── Playback ──────────────────────────────────────────────────
  const handlePress = async () => {
    try {
      if (status === 'playing' && soundRef.current) {
        await soundRef.current.pauseAsync();
        clearInterval(intervalRef.current ?? undefined);
        setStatus('paused');
        return;
      }
      if (status === 'paused' && soundRef.current) {
        await soundRef.current.playAsync();
        startPolling();
        setStatus('playing');
        return;
      }
      // Fresh load
      setStatus('loading');
      let Sound: any;
      try {
        const AV = await import('expo-av');
        Sound = AV.Audio.Sound;
        await AV.Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      } catch { setStatus('error'); return; }

      const { sound, status: s } = await Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (ps: any) => {
          if (!ps.isLoaded) return;
          if (ps.didJustFinish) {
            setStatus('idle');
            setProgress(0);
            setPosition(0);
            clearInterval(intervalRef.current ?? undefined);
          }
        }
      );
      soundRef.current = sound;
      const dur = (s as any).durationMillis ?? 0;
      setDuration(dur);
      durationRef.current = dur;
      setStatus('playing');
      startPolling();
    } catch (e) {
      console.error('AudioPlayer:', e);
      setStatus('error');
    }
  };

  const startPolling = () => {
    clearInterval(intervalRef.current ?? undefined);
    intervalRef.current = setInterval(async () => {
      // Don't overwrite UI while user is dragging
      if (!soundRef.current || scrubbingRef.current) return;
      try {
        const s = await soundRef.current.getStatusAsync();
        if (!s.isLoaded) return;
        const pos = s.positionMillis ?? 0;
        const dur = s.durationMillis ?? 1;
        setPosition(pos);
        setDuration(dur);
        durationRef.current = dur;
        setProgress(dur > 0 ? pos / dur : 0);
      } catch {}
    }, 250);
  };

  // ── Scrubbing ─────────────────────────────────────────────────
  // Compute fraction from absolute screen-X, clamped 0–1
  const pctFromScreenX = (screenX: number): number => {
    const raw = (screenX - trackXRef.current) / trackWRef.current;
    return Math.max(0, Math.min(1, raw));
  };

  // Update display immediately; actual seek is deferred to release to avoid
  // flooding setPositionAsync while dragging.
  const scrubDisplay = (pct: number) => {
    setProgress(pct);
    setPosition(Math.floor(pct * durationRef.current));
  };

  const flushSeek = async (pct: number) => {
    const ms = Math.floor(pct * durationRef.current);
    if (soundRef.current && durationRef.current > 0) {
      await soundRef.current.setPositionAsync(ms).catch(() => {});
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (e) => {
        scrubbingRef.current = true;
        const pct = pctFromScreenX(e.nativeEvent.pageX);
        pendingSeekRef.current = pct;
        scrubDisplay(pct);
      },
      onPanResponderMove: (e) => {
        const pct = pctFromScreenX(e.nativeEvent.pageX);
        pendingSeekRef.current = pct;
        scrubDisplay(pct);
      },
      onPanResponderRelease: async (e) => {
        const pct = pctFromScreenX(e.nativeEvent.pageX);
        await flushSeek(pct);
        // Small delay so the poll interval doesn't immediately snap back
        setTimeout(() => { scrubbingRef.current = false; }, 300);
      },
      onPanResponderTerminate: async () => {
        if (pendingSeekRef.current !== null) {
          await flushSeek(pendingSeekRef.current);
        }
        setTimeout(() => { scrubbingRef.current = false; }, 300);
      },
    })
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    // measure gives us page coords for absolute positioning
    e.target.measure((_x, _y, width, _h, pageX) => {
      trackXRef.current = pageX;
      trackWRef.current = width || 1;
    });
  };

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const icon = status === 'playing' ? '⏸' : '▶';
  // Freeze color at mount — prevents button changing color when parent re-renders
  // with a different accentColor (e.g. card flip switches front→back color)
  const colorRef = useRef(accentColor);
  const color = colorRef.current;

  return (
    <View style={[ap.wrap, { borderColor: color + '33', backgroundColor: color + '0A' }]}>
      <View style={ap.row}>
        {/* Play / pause — consistent style regardless of state */}
        <Pressable
          onPress={handlePress}
          style={[ap.btn, { backgroundColor: color + '22', borderColor: color + '44' }]}
        >
          {status === 'loading'
            ? <ActivityIndicator size="small" color={color} />
            : <Text style={[ap.btnIcon, { color }]}>{icon}</Text>
          }
        </Pressable>

        {/* Progress track */}
        <View style={ap.middle}>
          <View
            style={ap.trackHitArea}
            onLayout={onTrackLayout}
            {...panResponder.panHandlers}
          >
            <View style={[ap.track, { backgroundColor: color + '22' }]}>
              <View style={[ap.fill, { width: `${Math.round(progress * 100)}%` as any, backgroundColor: color }]} />
              <View style={[ap.thumb, { left: `${Math.round(progress * 100)}%` as any, backgroundColor: color }]} />
            </View>
          </View>
          <View style={ap.timeRow}>
            <Text style={ap.time}>{fmt(position)}</Text>
            {duration > 0 && <Text style={ap.time}>{fmt(duration)}</Text>}
          </View>
        </View>
      </View>
      {status === 'error' && <Text style={ap.errorText}>Unable to play audio.</Text>}
    </View>
  );
};

const ap = StyleSheet.create({
  wrap:        { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  row:         { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  btn:         { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  btnIcon:     { fontSize: 11, fontWeight: '700' },
  middle:      { flex: 1, gap: 3 },
  trackHitArea:{ height: 20, justifyContent: 'center' },
  track:       { height: 3, borderRadius: 2, overflow: 'visible', position: 'relative' },
  fill:        { height: 3, borderRadius: 2 },
  thumb:       { position: 'absolute', top: -3, width: 9, height: 9, borderRadius: 5, marginLeft: -4 },
  timeRow:     { flexDirection: 'row', justifyContent: 'space-between' },
  time:        { fontSize: 10, color: Colors.textMuted },
  errorText:   { fontSize: 10, color: Colors.error },
});