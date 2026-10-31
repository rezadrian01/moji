import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { defaultAiClient } from '@/ai/client';
import { listInsights, setReflection } from '@/db/insightsRepo';
import { useDb, useDbQuery } from '@/db/useDbQuery';
import { NOT_ENOUGH_DATA_TEXT } from '@/domain/insightText';
import { formatPeriodLabel } from '@/domain/period';
import type { Insight } from '@/domain/types';
import { useAiAllowed } from '@/features/app/useAiAllowed';
import { useTheme } from '@/theme/ThemeProvider';
import { Button } from '@/ui/Button';
import { useCalmMotion } from '@/ui/motion';
import { Text } from '@/ui/Text';

import { generateOnDemand } from './generate';
import { PatternFeedback } from './PatternFeedback';

const periodLabel = (i: Insight) => formatPeriodLabel(new Date(i.periodStart), new Date(i.periodEnd));

/** Satu insight lengkap: teks, pola dengan feedback, pertanyaan (opsional), dan refleksi. */
export function InsightView({ insight }: { insight: Insight }) {
  const theme = useTheme();
  const db = useDb();
  const { enter } = useCalmMotion();
  const [reflection, setReflectionText] = useState(insight.reflection ?? '');
  const [saved, setSaved] = useState(false);
  const keys = Object.keys(insight.patternTexts);

  return (
    <Animated.View entering={enter} style={{ gap: theme.space(4) }}>
      <Text variant="caption" muted>
        {periodLabel(insight)}
      </Text>
      <Text>{insight.text}</Text>
      {keys.map((key) => (
        <View
          key={key}
          style={{
            gap: theme.space(3),
            padding: theme.space(4),
            borderRadius: theme.radius.md,
            backgroundColor: theme.color.surface,
            borderWidth: 1,
            borderColor: theme.color.border,
          }}
        >
          <Text>{insight.patternTexts[key]}</Text>
          <PatternFeedback insightId={insight.id} patternKey={key} />
        </View>
      ))}
      {insight.questions.length > 0 ? (
        <View style={{ gap: theme.space(2) }}>
          <Text variant="heading" accessibilityRole="header">
            Kalau kamu mau merenung
          </Text>
          <Text variant="caption" muted>
            Pertanyaan ini hanya ajakan, tidak perlu dijawab.
          </Text>
          {insight.questions.map((q) => (
            <Text key={q}>{q}</Text>
          ))}
        </View>
      ) : null}
      <View style={{ gap: theme.space(2) }}>
        <TextInput
          accessibilityLabel="Tulis refleksimu (opsional)"
          placeholder="Tulis refleksimu (opsional)"
          placeholderTextColor={theme.color.textMuted}
          multiline
          value={reflection}
          onChangeText={(t) => {
            setReflectionText(t);
            setSaved(false);
          }}
          style={{
            minHeight: 96,
            padding: theme.space(3),
            textAlignVertical: 'top',
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.color.border,
            backgroundColor: theme.color.surface,
            color: theme.color.text,
            fontFamily: theme.font.regular,
            fontSize: 16,
          }}
        />
        <Button
          label="Simpan refleksi"
          variant="secondary"
          onPress={() => {
            const t = reflection.trim();
            void setReflection(db, insight.id, t === '' ? null : t).then(() => setSaved(true));
          }}
        />
        {saved ? (
          <Text variant="caption" muted accessibilityLiveRegion="polite">
            Refleksimu tersimpan.
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

type Status = 'idle' | 'loading' | 'not_enough' | 'failed';

export function InsightSection() {
  const theme = useTheme();
  const db = useDb();
  const aiAllowed = useAiAllowed();
  const ai = useMemo(() => defaultAiClient(), []);
  const [status, setStatus] = useState<Status>('idle');
  const { data: insights } = useDbQuery(listInsights, ['insights'], []);

  const onDemand = async () => {
    if (status === 'loading') return;
    setStatus('loading');
    try {
      const out = await generateOnDemand({ db, ai, aiAllowed: await aiAllowed(), now: new Date() });
      setStatus(out.status === 'not_enough_data' ? 'not_enough' : 'idle');
    } catch {
      setStatus('failed');
    }
  };

  const latest = insights?.[0];
  const earlier = insights?.slice(1) ?? [];

  return (
    <View style={{ gap: theme.space(4) }}>
      {latest ? (
        <InsightView key={latest.id} insight={latest} />
      ) : insights ? (
        <Text muted>Belum ada insight. Kamu bisa minta MOJI melihat catatanmu kapan saja.</Text>
      ) : null}

      <Button
        label="Lihat polaku"
        disabled={status === 'loading'}
        onPress={() => void onDemand()}
        accessibilityHint="MOJI melihat catatanmu 30 hari terakhir"
      />
      {status === 'loading' ? (
        <Text muted accessibilityLiveRegion="polite">
          MOJI sedang melihat catatanmu…
        </Text>
      ) : null}
      {status === 'not_enough' ? <Text muted>{NOT_ENOUGH_DATA_TEXT}</Text> : null}
      {status === 'failed' ? <Text muted>Belum berhasil sekarang. Kamu bisa coba lagi nanti.</Text> : null}

      {earlier.length > 0 ? (
        <View style={{ gap: theme.space(2) }}>
          <Text variant="heading" accessibilityRole="header">
            Insight sebelumnya
          </Text>
          {earlier.map((i) => (
            <Button
              key={i.id}
              label={`Buka insight ${periodLabel(i)}`}
              variant="secondary"
              onPress={() => router.push({ pathname: '/insight/[id]', params: { id: i.id } })}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
