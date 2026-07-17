import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

const LAST_UPDATED = '2026-07-16';
const CONTACT_EMAIL = 'dicipleofjx2@gmail.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <ThemedView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            개인정보처리방침
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.updated}>
            최종 수정일: {LAST_UPDATED}
          </ThemedText>

          <ThemedText style={styles.paragraph}>
            데이빗바이블(이하 &quot;앱&quot;)은 이용자의 개인정보를 소중히 여기며, 다음과 같이
            수집·이용·보관합니다.
          </ThemedText>

          <Section title="1. 수집하는 정보">
            <ThemedText style={styles.paragraph}>
              회원가입/로그인이 필요한 기능(성경통독방, 커뮤니티, 샬롬기도단)을 이용하실 경우
              아래 정보가 수집됩니다.
            </ThemedText>
            <ThemedText style={styles.listItem}>• 이메일 주소 (로그인 식별용)</ThemedText>
            <ThemedText style={styles.listItem}>
              • 닉네임/사용자명, 작성한 게시글·댓글·기도제목 등 커뮤니티 활동 내용
            </ThemedText>
            <ThemedText style={styles.paragraph}>
              말씀묵상 노트, 암송구절, 영성일기, 우선순위, 천국재정 등은{' '}
              <ThemedText type="smallBold">기기 내부에만 저장</ThemedText>되며, 외부 서버로
              전송되거나 수집되지 않습니다. 이 데이터는 앱을 삭제하거나 기기를 변경하면 함께
              사라지며 다른 기기와 동기화되지 않습니다.
            </ThemedText>
          </Section>

          <Section title="2. 정보의 이용 목적">
            <ThemedText style={styles.listItem}>• 로그인 및 계정 인증</ThemedText>
            <ThemedText style={styles.listItem}>
              • 성경통독방, 커뮤니티, 샬롬기도단 등 이용자 간 콘텐츠 공유 기능 제공
            </ThemedText>
            <ThemedText style={styles.listItem}>• 부적절한 게시물 신고·차단 등 운영 관리</ThemedText>
          </Section>

          <Section title="3. 제3자 제공 및 처리위탁">
            <ThemedText style={styles.paragraph}>
              회원 데이터(이메일, 게시글 등)는 백엔드 서비스인 Supabase(Supabase Inc.)의 서버에
              저장·처리됩니다. 이 앱은 광고를 게재하지 않으며, 수집한 개인정보를 마케팅 목적으로
              제3자에게 판매하거나 제공하지 않습니다.
            </ThemedText>
          </Section>

          <Section title="4. 보유 및 삭제">
            <ThemedText style={styles.paragraph}>
              회원 탈퇴 또는 게시물 삭제를 요청하시면 지체 없이 처리합니다. 계정 삭제를 원하시면
              아래 연락처로 이메일을 보내주세요.
            </ThemedText>
          </Section>

          <Section title="5. 이용자의 권리">
            <ThemedText style={styles.paragraph}>
              이용자는 언제든지 본인의 개인정보 열람, 정정, 삭제를 요청할 수 있으며, 앱 내
              프로필 화면에서 직접 닉네임 수정 및 로그아웃이 가능합니다.
            </ThemedText>
          </Section>

          <Section title="6. 문의처">
            <ThemedText style={styles.paragraph}>이메일: {CONTACT_EMAIL}</ThemedText>
          </Section>

          <ThemedText themeColor="textSecondary" style={styles.footer}>
            본 방침은 관련 법령 또는 서비스 변경에 따라 개정될 수 있으며, 변경 시 이 페이지를
            통해 고지합니다.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  updated: {
    marginTop: Spacing.one,
    marginBottom: Spacing.four,
  },
  section: {
    marginTop: Spacing.four,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    marginBottom: Spacing.two,
  },
  paragraph: {
    marginTop: Spacing.one,
  },
  listItem: {
    marginTop: Spacing.one,
    marginLeft: Spacing.two,
  },
  footer: {
    marginTop: Spacing.six,
    marginBottom: Spacing.five,
  },
});
