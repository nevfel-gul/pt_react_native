// ─────────────────────────────────────────────────────────────
// "Yeni ne var?" duyuruları.
//
// Yeni bir özellik duyurmak için listeye bir kayıt eklemek yeterli; her
// duyuru kullanıcı başına bir kez, popup sırasına uyarak gösterilir.
// En yeni (listede en altta olan) gösterilmemiş duyuru seçilir.
// ─────────────────────────────────────────────────────────────

export type Announcement = {
  /** Kalıcı kimlik — "görüldü" bilgisi buna bağlı, değiştirmeyin. */
  id: string;
  titleKey: string;
  bodyKey: string;
  ctaKey?: string;
  /** CTA'ya basınca gidilecek ekran. Yoksa CTA sadece kapatır. */
  route?: string;
  /** Sadece bu platformda göster. */
  platform?: "ios" | "android";
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "2026-10-home-widget",
    titleKey: "announcement.widget.title",
    bodyKey: "announcement.widget.body",
    ctaKey: "announcement.widget.cta",
  },
];
