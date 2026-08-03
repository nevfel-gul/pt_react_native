import type { ThemeUI } from "@/constants/types";
import { useTheme } from "@/constants/usetheme";
import { LinearGradient } from "expo-linear-gradient";
import { Cpu } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { BillingCycle, PlanDoc } from "@/constants/paywall";
import type { PremiumTier } from "@/constants/PremiumContext";
import { TIER_STUDENT_LIMITS, usePremium } from "@/constants/PremiumContext";
import { useTranslation } from "react-i18next";
import { calcDisplayedPrice, calcPerClientText } from "../../constants/paywall";

import i18n from "@/services/i18n";
import { useRouter } from 'expo-router';
import type { Purchase } from 'react-native-iap';
import { useIAP } from 'react-native-iap';

const ITEM_SKUS = [
  'athletrack_core_monthly',
  'athletrack_pro_monthly',
  'athletrack_studio_monthly',
  'athletrack_core_annually',
  'athletrack_pro_annually',
  'athletrack_studio_annually',
];

// Tier sıralaması: yüksek index = daha yüksek plan
const TIER_RANK: Record<string, number> = { core: 1, pro: 2, studio: 3 };

// IAP hata kodlarını kullanıcı dostu Türkçe mesajlara çevir
function iapErrorMessage(err: any): string {
  const code: string = err?.code ?? '';
  switch (code) {
    case 'E_NETWORK_ERROR':
      return 'İnternet bağlantınızı kontrol edip tekrar deneyin.';
    case 'E_SERVICE_ERROR':
      return 'App Store şu an yanıt vermiyor. Lütfen biraz sonra tekrar deneyin.';
    case 'E_ITEM_UNAVAILABLE':
      return 'Seçilen paket şu an satışta değil.';
    case 'E_PAYMENT_NOT_ALLOWED':
      return 'Bu cihazda satın alma işlemi kısıtlanmış (Ebeveyn Denetimleri).';
    case 'E_ALREADY_OWNED':
      return 'Bu pakete zaten abonesiniz. Satın almaları geri yüklemeyi deneyin.';
    case 'E_UNKNOWN':
    default:
      return err?.message || 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.';
  }
}

type BusyState = 'purchase' | 'restore' | null;

type Props = {
  onPurchase?: (args: {
    plan: PlanDoc;
    billing: BillingCycle;
    productId: string;
  }) => Promise<void> | void;
  onRestorePurchases?: () => Promise<void> | void;
};

export default function PaywallMonthlyScreen({
  onPurchase,
  onRestorePurchases,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme, mode } = useTheme();
  const { updateSubscription } = usePremium();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<PlanDoc[]>([]);
  const [billing, setBilling] = useState<BillingCycle>("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [busyState, setBusyState] = useState<BusyState>(null);

  // Stale closure önleme: ref'lerde tut
  const selectedPlanRef = useRef(selectedPlanId);
  const billingRef = useRef(billing);
  const allProductsRef = useRef(allProducts);
  useEffect(() => { selectedPlanRef.current = selectedPlanId; }, [selectedPlanId]);
  useEffect(() => { billingRef.current = billing; }, [billing]);
  useEffect(() => { allProductsRef.current = allProducts; }, [allProducts]);

  // Satın alınan productId'yi kendimiz de takip et
  // (activeSubscriptions gecikmeli dolabilir, bu fallback olarak kullanılır)
  const [purchasedProductId, setPurchasedProductId] = useState<string | null>(null);

  // finishTransaction ve getActiveSubscriptions henüz tanımlanmadan önce
  // callback içinde kullanılıyor — ref ile circular dependency'yi çöz
  const finishTransactionRef = useRef<((args: { purchase: Purchase; isConsumable: boolean }) => Promise<void>) | null>(null);
  const getActiveSubscriptionsRef = useRef<(() => Promise<any>) | null>(null);

  const {
    connected,
    subscriptions,
    activeSubscriptions,
    fetchProducts: fetchSubs,
    requestPurchase,
    finishTransaction,
    restorePurchases,
    getActiveSubscriptions,
  } = useIAP({
    onPurchaseSuccess: useCallback(async (purchase: Purchase) => {
      // 1. Önce transaction'ı Apple'a onayla
      try {
        await finishTransactionRef.current?.({ purchase, isConsumable: false });
      } catch (e) {
        console.warn('[IAP] finishTransaction error:', e);
      }

      // 2. Satın alınan productId'yi kaydet (badge için)
      if (purchase.productId) {
        setPurchasedProductId(purchase.productId);
      }

      // 3. activeSubscriptions'ı güncelle
      try {
        await getActiveSubscriptionsRef.current?.();
      } catch (e) {
        console.warn('[IAP] getActiveSubscriptions error after purchase:', e);
      }

      // 4. Subscription bilgisini Firestore'a kaydet ve sonucu doğrula
      let premiumActivated = false;
      let activatedTier: PremiumTier = 'pro';
      let activatedIsUnlimited = false;
      try {
        const planId = selectedPlanRef.current;
        const plan = allProductsRef.current.find((p) => p.id === planId) ?? null;
        if (plan) {
          const tier = (plan.tier ?? 'pro') as PremiumTier;
          const isUnlimited = tier === 'studio';
          const studentLimit = TIER_STUDENT_LIMITS[tier];
          await updateSubscription({
            productId: purchase.productId,
            tier,
            billing: billingRef.current,
            isActive: true,
            studentLimit: studentLimit ?? null,
            isUnlimited,
            purchasedAt: new Date().toISOString(),
          });
          // Firestore yazımı başarılı → premium aktif
          premiumActivated = true;
          activatedTier = tier;
          activatedIsUnlimited = isUnlimited;
        }
      } catch (e) {
        console.warn('[IAP] updateSubscription Firestore error:', e);
      }

      setBusyState(null);

      // 5. Sonucu kullanıcıya bildir
      if (premiumActivated) {
        const tierLabel = activatedTier === 'studio' ? 'Studio' : activatedTier === 'pro' ? 'Pro' : 'Core';
        const limitText = activatedIsUnlimited
          ? 'Sınırsız öğrenci ekleyebilirsiniz.'
          : `${TIER_STUDENT_LIMITS[activatedTier]} öğrenciye kadar ekleyebilirsiniz.`;
        Alert.alert(
          'Premium Aktif!',
          `${tierLabel} planınız başarıyla aktif edildi.\n${limitText}`,
          [{ text: 'Harika!', onPress: () => router.replace('/(tabs)') }],
        );
      } else {
        Alert.alert(
          'Ödeme Alındı',
          'Ödemeniz alındı ancak hesabınıza yansıtılması biraz zaman alabilir. Sorun devam ederse "Satın Almaları Geri Yükle" seçeneğini deneyin.',
        );
      }

      // 6. Üst katmana bildir (isteğe bağlı ek işlemler için)
      if (onPurchase) {
        const planId = selectedPlanRef.current;
        const plan = allProductsRef.current.find((p) => p.id === planId) ?? null;
        if (plan) {
          await onPurchase({
            plan,
            billing: billingRef.current,
            productId: purchase.productId,
          });
        }
      }
    }, [onPurchase, router, updateSubscription]),

    onPurchaseError: useCallback((err: any) => {
      setBusyState(null);
      if (err?.code !== 'E_USER_CANCELLED') {
        Alert.alert(t("paywall.error.title"), err?.message || t("paywall.error.payment"));
      }
    }, [t]),
  });

  // Mevcut aktif abonelik (varsa)
  const currentActiveSub = useMemo(
    () => activeSubscriptions.find((s) => s.isActive) ?? null,
    [activeSubscriptions],
  );

  // Aktif aboneliğin productId'si:
  // - Önce activeSubscriptions'tan bak (currentPlanId veya productId)
  // - Yoksa kendi tuttuğumuz purchasedProductId'yi kullan
  // - Her iki taraf da geçerli string olmalı (null/undefined karşılaştırma hatasını önler)
  const activeProductId = useMemo((): string | null => {
    const fromSub = currentActiveSub?.currentPlanId ?? currentActiveSub?.productId ?? null;
    if (fromSub && fromSub.length > 0) return fromSub;
    if (purchasedProductId && purchasedProductId.length > 0) return purchasedProductId;
    return null;
  }, [currentActiveSub, purchasedProductId]);

  // Mevcut plandaki tier (upgrade/downgrade kararı için)
  const currentTierRank = useMemo(() => {
    if (!activeProductId) return 0;
    const tier = activeProductId.includes('core') ? 'core'
      : activeProductId.includes('studio') ? 'studio' : 'pro';
    return TIER_RANK[tier] ?? 0;
  }, [activeProductId]);

  // Ref'leri her render'da güncelle (circular dependency olmadan güncel fonksiyon)
  useEffect(() => { finishTransactionRef.current = finishTransaction as any; }, [finishTransaction]);
  useEffect(() => { getActiveSubscriptionsRef.current = getActiveSubscriptions; }, [getActiveSubscriptions]);

  // Ürünleri çek + mevcut aktif aboneliği sorgula
  const doFetchSubs = useCallback(() => {
    setLoading(true);
    setFetchError(null);
    Promise.all([
      fetchSubs({ skus: ITEM_SKUS, type: 'subs' }),
      // Mevcut aktif abonelikleri çek → badge doğru çalışsın
      getActiveSubscriptions().catch((e) =>
        console.warn('[IAP] getActiveSubscriptions error:', e)
      ),
    ])
      .catch((e) => {
        console.error('[IAP] fetchSubs error:', e);
        setFetchError('Paketler yüklenemedi. İnternet bağlantınızı kontrol edin.');
      })
      .finally(() => setLoading(false));
  }, [fetchSubs, getActiveSubscriptions]);


  useEffect(() => {
    if (!connected) return;
    doFetchSubs();
  }, [connected, doFetchSubs]);

  // subscriptions gelince PlanDoc'a dönüştür
  useEffect(() => {
    if (subscriptions.length === 0) return;

    const parseAmount = (raw: unknown): number =>
      typeof raw === 'number'
        ? raw
        : parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0;

    // Apple'ın localized fiyat string'i. react-native-iap v14 → displayPrice;
    // eski sürüm alanı localizedPrice; ikisi de yoksa sayısaldan güvenli fallback.
    const pickDisplayPrice = (prod: any, amount: number): string => {
      const s = prod?.displayPrice ?? prod?.localizedPrice;
      return typeof s === 'string' && s.length > 0 ? s : amount.toFixed(2);
    };

    const getTier = (pId: string) =>
      pId.includes('core') ? 'core' : pId.includes('studio') ? 'studio' : 'pro';

    // 1) Ham ürünleri çıkar (fiyat Apple'dan olduğu gibi alınır)
    const base = subscriptions.map((prod, index) => {
      const pId = prod.id;
      const amount = parseAmount(prod.price);
      return {
        prod,
        index,
        pId,
        tier: getTier(pId),
        amount,
        displayPrice: pickDisplayPrice(prod, amount),
      };
    });

    // 2) Tier başına aylık ürün fiyatını topla (gerçek indirim yüzdesi hesabı için)
    const monthlyByTier: Record<string, number> = {};
    base.forEach((b) => {
      if (b.pId.includes('monthly')) monthlyByTier[b.tier] = b.amount;
    });

    const formatted: PlanDoc[] = base.map((b) => {
      // İndirim yüzdesi = gerçek aylık ve yıllık Apple fiyatlarından türetilir (uydurma değil).
      let annualDiscountPercent = 0;
      if (b.pId.includes('annually')) {
        const monthly = monthlyByTier[b.tier];
        if (monthly && monthly > 0) {
          annualDiscountPercent = Math.round((1 - b.amount / (monthly * 12)) * 100);
          if (annualDiscountPercent < 0) annualDiscountPercent = 0;
        }
      }

      return {
        id: b.pId,
        active: true,
        sortOrder: b.index + 1,
        tier: b.tier,
        title: b.prod.title || 'Plan',
        subtitle: b.prod.description || '',
        currency: b.prod.currency || 'USD',
        monthlyPrice: b.amount,
        priceAmount: b.amount,
        displayPrice: b.displayPrice,
        topPick: b.pId.includes('pro'),
        features: [],
        annualDiscountPercent,
        isUnlimited: b.pId.includes('studio'),
        studentLimit: TIER_STUDENT_LIMITS[b.tier as PremiumTier] ?? null,
        perClientNoteMode: 'auto',
        footnote: null,
      };
    });
    setAllProducts(formatted);
    const initial =
      formatted.find((p) => p.id.includes('monthly') && p.id.includes('pro')) ||
      formatted.find((p) => p.id.includes('monthly')) ||
      formatted[0];
    setSelectedPlanId(initial?.id ?? null);
  }, [subscriptions]);

  const plans = useMemo(() => {
    const suffix = billing === 'annual' ? 'annually' : 'monthly';
    return allProducts.filter((p) => p.id.includes(suffix));
  }, [allProducts, billing]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  // Billing değişince seçili planı aynı tier'da tut
  useEffect(() => {
    if (allProducts.length === 0) return;
    const suffix = billing === 'annual' ? 'annually' : 'monthly';
    const currentTier = selectedPlanId?.includes('core')
      ? 'core'
      : selectedPlanId?.includes('studio')
        ? 'studio'
        : 'pro';
    const next =
      allProducts.find((p) => p.id.includes(suffix) && p.id.includes(currentTier)) ||
      allProducts.find((p) => p.id.includes(suffix));
    setSelectedPlanId(next?.id ?? null);
  }, [billing, allProducts, selectedPlanId]);

  const getAppleProductId = useCallback(
    (plan: PlanDoc, cycle: BillingCycle) => {
      const tier = (plan.tier ?? 'pro').toLowerCase();
      return cycle === 'annual'
        ? `athletrack_${tier}_annually`
        : `athletrack_${tier}_monthly`;
    },
    [],
  );

  // Seçilen plan ile mevcut abonelik arasındaki ilişki
  const purchaseAction = useMemo((): 'new' | 'upgrade' | 'downgrade' | 'same' => {
    if (!activeProductId) return 'new';
    if (!selectedPlanId) return 'new';
    if (activeProductId === selectedPlanId) return 'same';
    const selectedTier = selectedPlanId.includes('core') ? 'core'
      : selectedPlanId.includes('studio') ? 'studio' : 'pro';
    const selectedRank = TIER_RANK[selectedTier] ?? 0;
    return selectedRank > currentTierRank ? 'upgrade' : 'downgrade';
  }, [activeProductId, selectedPlanId, currentTierRank]);

  const handlePurchase = useCallback(async () => {
    if (!selectedPlan || busyState) return;

    const productId = getAppleProductId(selectedPlan, billing);

    // Mevcut plana tıklandıysa işlem yok
    if (purchaseAction === 'same') {
      Alert.alert('Mevcut Planınız', 'Bu pakete zaten abonesiniz.');
      return;
    }

    // Upgrade/downgrade için onay al
    if (purchaseAction === 'upgrade' || purchaseAction === 'downgrade') {
      const actionLabel = purchaseAction === 'upgrade' ? 'yükseltmek' : 'düşürmek';
      const confirm = await new Promise<boolean>((resolve) => {
        Alert.alert(
          purchaseAction === 'upgrade' ? 'Planı Yükselt' : 'Planı Değiştir',
          `Aboneliğinizi ${selectedPlan.title} planına ${actionLabel} istiyor musunuz?\n\nDeğişiklik bir sonraki faturalama döneminde geçerli olur.`,
          [
            { text: 'Vazgeç', style: 'cancel', onPress: () => resolve(false) },
            {
              text: purchaseAction === 'upgrade' ? 'Yükselt' : 'Değiştir',
              style: purchaseAction === 'upgrade' ? 'default' : 'destructive',
              onPress: () => resolve(true),
            },
          ],
        );
      });
      if (!confirm) return;
    }

    setBusyState('purchase');
    try {
      await requestPurchase({ request: { apple: { sku: productId } }, type: 'subs' });
      // onPurchaseSuccess callback'i başarıda tetiklenir, burada setBusy(null) gerek yok
    } catch (e: any) {
      if (e?.code !== 'E_USER_CANCELLED') {
        Alert.alert(t("paywall.error.title"), e?.message || t("paywall.error.payment"));
      }
      setBusyState(null);
    }
  }, [billing, busyState, getAppleProductId, purchaseAction, requestPurchase, selectedPlan]);



  // Satın almaları geri yükle
  const handleRestore = useCallback(async () => {
    if (busyState) return;
    setBusyState('restore');
    try {
      // Önce kütüphanenin kendi restore'unu çalıştır
      await restorePurchases();

      // Aktif abonelikleri yenile
      try {
        await getActiveSubscriptionsRef.current?.();
      } catch (e) {
        console.warn('[IAP] getActiveSubscriptions after restore error:', e);
      }

      // Geri yüklenen subscription varsa Firestore'a kaydet
      // activeSubscriptions ref üzerinden kontrol — restore sonrası güncellenir
      const activeSubs = activeSubscriptions;
      const restoredSub = activeSubs.find((s) => s.isActive);
      if (restoredSub) {
        const restoredProductId = restoredSub.currentPlanId ?? restoredSub.productId ?? '';
        if (restoredProductId) {
          const tier = (restoredProductId.includes('core')
            ? 'core'
            : restoredProductId.includes('studio')
              ? 'studio'
              : 'pro') as PremiumTier;
          const billing = restoredProductId.includes('annually') ? 'annual' : 'monthly';
          const isUnlimited = tier === 'studio';
          try {
            await updateSubscription({
              productId: restoredProductId,
              tier,
              billing,
              isActive: true,
              studentLimit: TIER_STUDENT_LIMITS[tier] ?? null,
              isUnlimited,
              purchasedAt: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[IAP] restore updateSubscription error:', e);
          }
          setPurchasedProductId(restoredProductId);
        }
      }

      // Üst katmana da bildir (isteğe bağlı ek işlemler için)
      if (onRestorePurchases) {
        await onRestorePurchases();
      } else {
        Alert.alert(
          'Satın Almalar Geri Yüklendi',
          'Aktif abonelikleriniz başarıyla geri yüklendi.',
        );
      }
    } catch (e: any) {
      Alert.alert(
        'Geri Yükleme Başarısız',
        iapErrorMessage(e),
      );
    } finally {
      setBusyState(null);
    }
  }, [activeSubscriptions, busyState, onRestorePurchases, restorePurchases, updateSubscription]);

  // CTA etiketini duruma göre belirle
  const ctaLabel = useMemo(() => {
    if (busyState === 'purchase') return t('paywall.cta.processing');
    if (purchaseAction === 'upgrade') return 'Planı Yükselt →';
    if (purchaseAction === 'downgrade') return 'Planı Değiştir →';
    if (purchaseAction === 'same') return 'Mevcut Planınız';
    return t('paywall.cta.buy');
  }, [busyState, purchaseAction, t]);

  const saveText = useMemo(() => {
    // Aylık/yıllık her iki görünümde de yıllık tasarrufu tanıt.
    // Yüzde gerçek Apple fiyatlarından hesaplandı; en yüksek tasarrufu ("up to") göster.
    const annualDiscounts = allProducts
      .filter((p) => p.id.includes('annually'))
      .map((p) => p.annualDiscountPercent ?? 0);
    const d = annualDiscounts.length ? Math.max(...annualDiscounts) : 0;
    return d ? t('paywall.billing.save', { percent: d }) : null;
  }, [allProducts, t]);

  const accent = billing === 'annual' ? theme.colors.premium : theme.colors.primary;

  const onToggleBilling = useCallback((v: boolean) => setBilling(v ? 'annual' : 'monthly'), []);
  const onSelectPlan = useCallback((id: string) => setSelectedPlanId(id), []);

  const isBusy = busyState !== null;
  const continueDisabled = !selectedPlan || isBusy || purchaseAction === 'same';

  const styles = useMemo(() => makeStyles(theme, mode), [theme, mode]);

  const buyButtonGradient = useMemo<[string, string, string, string, string]>(() => {
    if (purchaseAction === 'same') {
      return ['#888', '#aaa', '#ccc', '#aaa', '#888'];
    }
    if (billing === 'annual') {
      return [theme.colors.premium, '#8f4fff', '#b082ff', '#8f4fff', theme.colors.premium];
    }
    return [theme.colors.primary, '#38bdf8', '#8ec1fb', '#38bdf8', theme.colors.primary];
  }, [billing, purchaseAction, theme.colors.premium, theme.colors.primary]);

  const commonFeatures = useMemo(
    () => [
      {
        title: t('paywall.features.ai_filter.title'),
        description: t('paywall.features.ai_filter.description'),
      },
      {
        title: t('paywall.features.analytics.title'),
        description: t('paywall.features.analytics.description'),
      },
      {
        title: t('paywall.features.records.title'),
        description: t('paywall.features.records.description'),
      },
    ],
    [t],
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View pointerEvents="none" style={styles.bgPhotoWrap}>
        <Image
          source={require('@/assets/images/paywall/odeme_ekrani_arka_plan.jpg')}
          style={styles.bgPhoto}
          resizeMode="cover"
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.bgOverlay,
          {
            backgroundColor:
              mode === 'light' ? 'rgba(255,255,255,0.42)' : 'rgba(2,6,23,0.38)',
          },
        ]}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: 16 }]}
        showsVerticalScrollIndicator={false}
        bounces
        alwaysBounceVertical
      >
        <View style={styles.hero}>
          <Text style={[styles.h1, { color: accent }]}>
            {t('paywall.hero.title')}
          </Text>
          <Text style={styles.desc}>{t('paywall.hero.description')}</Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t('paywall.billing.monthly')}</Text>
            <Switch
              value={billing === 'annual'}
              onValueChange={onToggleBilling}
              thumbColor={theme.colors.surface}
              trackColor={{
                false: mode === 'light' ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.18)',
                true: accent,
              }}
              ios_backgroundColor={
                mode === 'light' ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.18)'
              }
            />
            <Text style={styles.toggleLabel}>{t('paywall.billing.annual')}</Text>
            {saveText ? (
              <Text style={[styles.saveText, { color: accent }]}>{saveText}</Text>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={theme.colors.text.muted} />
          </View>
        ) : fetchError ? (
          // Yükleme hatası → retry butonu göster
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>{fetchError}</Text>
            <TouchableOpacity
              onPress={doFetchSubs}
              style={[styles.retryBtn, { borderColor: accent }]}
            >
              <Text style={[styles.retryText, { color: accent }]}>Tekrar Dene</Text>
            </TouchableOpacity>
          </View>
        ) : plans.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyText}>{t('paywall.loading.no_plans')}</Text>
          </View>
        ) : (
          <View style={styles.planList}>
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                billing={billing}
                selected={p.id === selectedPlanId}
                // null guard: her iki taraf da geçerli string olmalı
                isCurrentPlan={
                  !!p.id && !!activeProductId && p.id === activeProductId
                }
                onPress={() => onSelectPlan(p.id)}
                accent={accent}
                theme={theme}
                mode={mode}
              />
            ))}
          </View>
        )}

        <View style={styles.featuresRow}>
          {commonFeatures.map((item) => (
            <FeatureMini
              key={item.title}
              title={item.title}
              description={item.description}
              theme={theme}
              mode={mode}
              muted={false}
            />
          ))}
        </View>

        <Text style={styles.cancelText}>{t("paywall.cancel_text")}</Text>

        <View
          style={[styles.fixedBottom, { paddingBottom: 8 + insets.bottom }]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePurchase}
            disabled={continueDisabled}
            style={[styles.buyBtnWrap, continueDisabled && styles.ctaDisabled]}
          >
            <LinearGradient
              colors={buyButtonGradient}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              locations={[0, 0.25, 0.5, 0.75, 1]}
              style={styles.buyBtnGradient}
            >
              {busyState === 'purchase' ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buyBtnText}>{ctaLabel}</Text>
              )}
              <Text style={styles.buyBtnArrow}>→</Text>
            </LinearGradient>
          </TouchableOpacity>
          {/* EULA - Apple Guideline 3.1.2(c) */}
          <View style={{ marginTop: 8, marginBottom: 4, alignItems: 'center' }}>
            <Text style={{
              color: theme.colors.text.muted,
              fontSize: 11,
              textAlign: 'center',
              lineHeight: 16,
              fontWeight: '600'
            }}>
              {t('paywall.legal.agree_prefix')}
              <Text
                style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
                onPress={() => {
                  const l = i18n.language.startsWith('tr') ? 'tr' : 'en';
                  Linking.openURL(`https://www.athletrackai.com/${l}/terms-of-service`);
                }}
              >
                {t('paywall.legal.terms')}
              </Text>
              {' & '}
              <Text
                style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
                onPress={() => {
                  const l = i18n.language.startsWith('tr') ? 'tr' : 'en';
                  Linking.openURL(`https://www.athletrackai.com/${l}/privacy-policy`);
                }}
              >
                {t('paywall.legal.privacy')}
              </Text>
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleRestore}
            disabled={isBusy}
            style={[styles.restoreBtn, isBusy && styles.ctaDisabled]}
          >
            {busyState === 'restore' ? (
              <ActivityIndicator color={theme.colors.text.muted} size="small" />
            ) : (
              <Text style={styles.restoreText}>{t("paywall.cta.restore")}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
// ─────────────────────────────────────────────
// PlanCard
// ─────────────────────────────────────────────
const PlanCard = memo(function PlanCard({
  plan,
  billing,
  selected,
  isCurrentPlan,
  onPress,
  accent,
  theme,
  mode,
}: {
  plan: PlanDoc;
  billing: BillingCycle;
  selected: boolean;
  isCurrentPlan: boolean;
  onPress: () => void;
  accent: string;
  theme: ThemeUI;
  mode: 'dark' | 'light';
}) {
  const priceInfo = useMemo(() => calcDisplayedPrice(plan, billing), [plan, billing]);
  const perClient = useMemo(() => {
    if (plan.isUnlimited) return null;
    if (plan.perClientNoteMode === 'custom') return plan.footnote ?? null;
    return calcPerClientText(plan, billing);
  }, [plan, billing]);

  const { t } = useTranslation();
  const cardBg = mode === 'light' ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.1)';
  const border = mode === 'light' ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.06)';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[
        {
          backgroundColor: cardBg,
          borderRadius: theme.radius.xl,
          paddingVertical: 18,
          paddingHorizontal: 18,
          borderWidth: 1,
          borderColor: border,
        },
        plan.topPick && {
          borderColor: mode === 'light' ? 'rgba(15,23,42,0.16)' : 'rgba(255,255,255,0.12)',
        },
        selected && {
          borderWidth: 2,
          borderColor: accent,
          shadowColor: accent,
          shadowOpacity: 0.3,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
        },
      ]}
    >
      {/* Top Pick rozeti */}
      {plan.topPick ? (
        <View
          style={{
            position: 'absolute',
            left: 12,
            top: -12,
            backgroundColor: theme.colors.gold,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: theme.radius.pill,
            zIndex: 10,
          }}
        >
          <Text style={{ color: theme.colors.surfaceDark, fontWeight: '900', fontSize: 13 }}>
            {t('paywall.plan.top_pick')}
          </Text>
        </View>
      ) : null}

      {/* Mevcut Plan rozeti */}
      {isCurrentPlan ? (
        <View
          style={{
            position: 'absolute',
            right: 12,
            top: -12,
            backgroundColor: accent,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: theme.radius.pill,
            zIndex: 10,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 11 }}>
            Mevcut Planınız
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '900',
              marginBottom: 6,
              letterSpacing: -0.45,
              color: accent,
            }}
          >
            {plan.title}
          </Text>
          <Text
            style={{
              color: theme.colors.text.secondary,
              fontSize: 14,
              fontWeight: '800',
              lineHeight: 18,
            }}
          >
            {plan.subtitle}
          </Text>
          <Text
            style={{
              color: plan.isUnlimited ? accent : theme.colors.text.muted,
              fontSize: 12,
              fontWeight: '900',
              marginTop: 6,
            }}
          >
            {plan.isUnlimited
              ? 'Sınırsız öğrenci'
              : `${TIER_STUDENT_LIMITS[(plan.tier ?? 'pro') as PremiumTier] ?? 0} öğrenciye kadar`}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              color: theme.colors.text.primary,
              fontSize: 28,
              fontWeight: '900',
              letterSpacing: -0.5,
            }}
          >
            {/* App Store Connect fiyatı OLDUĞU GİBI (para birimi sembolü Apple string'inde) */}
            {priceInfo.price}{' '}
            <Text style={{ color: theme.colors.text.muted, fontSize: 12, fontWeight: '900' }}>
              {priceInfo.period === 'year'
                ? t('paywall.plan.period_year')
                : t('paywall.plan.period_month')}
            </Text>
          </Text>

          {perClient ? (
            <Text style={{ marginTop: 6, color: theme.colors.text.muted, fontSize: 12, fontWeight: '900' }}>
              {perClient}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─────────────────────────────────────────────
// FeatureMini
// ─────────────────────────────────────────────
function FeatureMini({
  title,
  description,
  muted,
  theme,
  mode,
}: {
  title: string;
  muted?: boolean;
  theme: ThemeUI;
  mode: 'dark' | 'light';
  description: string;
}) {
  const chipBg = mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(15,23,42,0.04)';
  const chipBorder = mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)';

  return (
    <View style={{ width: '31%', alignItems: 'center', opacity: muted ? 0.28 : 1 }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: theme.radius.pill,
          backgroundColor: chipBg,
          borderWidth: 1,
          borderColor: chipBorder,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 8,
        }}
      >
        <Cpu size={20} color={theme.colors.text.muted} />
      </View>
      <Text
        style={{
          color: theme.colors.text.secondary,
          fontWeight: '900',
          fontSize: 12,
          textAlign: 'center',
          marginBottom: 4,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: theme.colors.text.muted,
          fontSize: 10,
          lineHeight: 12,
          textAlign: 'center',
        }}
      >
        {description}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
function makeStyles(theme: ThemeUI, mode: 'dark' | 'light') {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },

    bgPhotoWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    bgOverlay: { ...StyleSheet.absoluteFillObject },
    bgPhoto: {
      width: '100%',
      height: '100%',
      opacity: mode === 'light' ? 0.42 : 0.32,
    },

    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg + 8,
    },

    hero: { paddingBottom: theme.spacing.md },

    h1: {
      fontSize: 44,
      fontWeight: '900',
      letterSpacing: -1.0,
      lineHeight: 46,
      marginBottom: 10,
    },

    desc: {
      color: theme.colors.text.secondary,
      fontSize: 13,
      lineHeight: 17,
      marginBottom: 12,
      fontWeight: '700',
    },

    toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    toggleLabel: { color: theme.colors.text.primary, fontWeight: '900', fontSize: 15 },
    saveText: { fontWeight: '900', fontSize: 15 },

    centerBox: { paddingVertical: 22, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: theme.colors.text.secondary, fontWeight: '800', fontSize: 16, textAlign: 'center' },

    retryBtn: {
      marginTop: 14,
      borderWidth: 1.5,
      borderRadius: theme.radius.lg,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    retryText: { fontWeight: '900', fontSize: 14 },

    planList: { gap: 14, paddingTop: 10 },

    featuresRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 18,
      paddingTop: 6,
      opacity: mode === 'dark' ? 0.82 : 0.96,
    },

    cancelText: {
      marginTop: 14,
      textAlign: 'center',
      color: theme.colors.text.secondary,
      fontWeight: '900',
      fontSize: 13,
    },

    // Butonlar bölümü — ScrollView dışında
    fixedBottom: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: 18,
      backgroundColor: 'transparent',
    },

    buyBtnWrap: { borderRadius: theme.radius.lg, overflow: 'hidden' },
    buyBtnGradient: {
      borderRadius: theme.radius.lg,
      paddingVertical: 14,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    buyBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
    buyBtnArrow: { color: '#ffffff', fontSize: 17, fontWeight: '900', marginLeft: 4 },
    ctaDisabled: { opacity: 0.55 },

    restoreBtn: {
      marginTop: 10,
      borderRadius: theme.radius.lg,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.14)',
      backgroundColor: 'transparent',
    },
    restoreText: { color: theme.colors.text.primary, fontSize: 14, fontWeight: '900' },
  });
}
