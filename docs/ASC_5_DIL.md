# App Store Connect — 5 yeni dil (v1.3)

Hazırlanma: 2026-10-08. Ad / alt başlık / anahtar kelime uzunlukları ve dil
içi tekrarlar `app-store-aso-ru/scripts/validate-fields.py` ile kontrol edildi.

## Kelimeler nereden geldi

Her ülkenin App Store arama önerilerine (autosuggest) baktım:
- 🇧🇷 `avaliação física` Brezilya'da gerçekten aranıyor (rakipler de adında kullanıyor) → **ada** koydum. `personal trainer` orada da İngilizce aranıyor → alt başlıkta.
- 🇩🇪 `personal trainer` ve `körpermaße`, `körperfettanteil` öneriliyor → ad + anahtar kelime.
- 🇫🇷 Fransızlar `coach sportif` diye arıyor (`personal trainer` değil) → ad. `suivi poids` de öneriliyor.
- 🇮🇹 `personal trainer`, `gestione clienti`, `schede clienti`, `schede palestra` öneriliyor → ad + anahtar kelime.
- 🇪🇸 `entrenador personal` öneriliyor → ad.

## Girerken bilmen gerekenler

- **Nereye:** App Store Connect → uygulama → sağ üstteki dil menüsü →
  "+" ile dili ekle. **Ad ve alt başlık** "App Information" sayfasına,
  **açıklama, anahtar kelime, promosyon metni, What's New ve ekran görüntüleri**
  1.3 sürüm sayfasına girilir.
- **Ad, alt başlık ve anahtar kelimeler sadece yeni sürümle değişir**: 1.3 ile
  birlikte gir.
- **Hangi ülke hangi dili tarar:** Almanya/Avusturya `de-DE` + `en-GB`,
  Fransa `fr-FR` + `en-GB`, İtalya `it` + `en-GB`, İspanya `es-ES` + `en-GB`,
  Brezilya `pt-BR` + `en-GB`. Yani en-GB'de zaten olan kelimeleri (coach, gym,
  tanita, posture, vo2max, test, studio, session, progress, crm, planner,
  client, tracker, body, composition, assessment…) bu dillerin anahtar
  kelimelerine **tekrar yazmadım**; yer boşa gitmesin.
- **Meksika / Latin Amerika** için ayrı `es-MX` dili var. İstersen İspanyolca
  metnin aynısını oraya da yapıştır; tek fark "bono" yerine "paquete" demek
  daha doğal olur.
- Anahtar kelime alanı: virgülle ayır, **boşluk bırakma**, olduğu gibi kopyala.

---

## 🇩🇪 Almanca — German (`de-DE`)

**Ad:** `AthleTrack: Personal Trainer` (28/30)

**Alt başlık:** `Kunden, Messungen & Termine` (27/30)

**Anahtar kelimeler:** `personaltrainer,fitnesstrainer,kundenverwaltung,körpermaße,körperfett,fitnesstest,anamnese,parq` (95/100)

**Promosyon metni:**
```
Neu: Pakete & Einheiten im Blick – verbleibende Stunden, Zahlungen und Termine an einem Ort. Dazu ein Homescreen-Widget für deinen Tag.
```

**What's New (1.3):**
```
• Paket- und Einheitenverwaltung: verbleibende Stunden, Zahlungen, Notizen zur Einheit
• KI-Einschätzung nach jeder Messung
• Transformations-Karte zum Teilen
• Homescreen-Widget mit den heutigen Terminen
• Termine im Telefonkalender, WhatsApp-Vorlagen
• Neu auf Deutsch, Spanisch, Portugiesisch, Französisch und Italienisch
• Wahlweise kg/cm oder lb/in
• iPad-Layout und viele Verbesserungen
```

**Açıklama:**
```
Die All-in-one-App für Personal Trainer: Kundenaufnahme mit PAR-Q, Körperanalyse, Umfangmessungen, Fitnesstests, Termine, Pakete und Zahlungen – ohne Excel und Zettelwirtschaft.

AthleTrack ersetzt Papierbögen und Tabellen durch ein übersichtliches Kundenprofil. Du siehst auf einen Blick, wie sich jeder Kunde entwickelt, wann die nächste Messung fällig ist und wie viele Einheiten noch im Paket sind.

■ KUNDENAUFNAHME
• PAR-Q-Fragebogen mit Hinweis auf ärztliche Freigabe
• Ziele, Trainingserfahrung, Schlaf, Stress, Ernährung, Notfallkontakt
• Verletzungen, Operationen und Medikamente übersichtlich festgehalten

■ MESSUNGEN & TESTS
• Körperzusammensetzung (z. B. Tanita / Bioimpedanz): Gewicht, Körperfett, Muskelmasse, Viszeralfett, Stoffwechselalter
• Umfänge mit dem Maßband, Taille-Hüft-Verhältnis, Ruheblutdruck
• Statische Haltungsanalyse und Overhead-Squat-Test
• Sit-and-Reach, Liegestütze, Sit-ups, Plank, Wall Sit, 1RM-Kniebeuge
• YMCA-Stufentest, Bruce-Protokoll, Karvonen-Zielpuls, VO₂max
• Automatische Bewertung nach Alter und Geschlecht anhand veröffentlichter Normtabellen

■ FORTSCHRITT & KI
• Verlaufsdiagramme für Gewicht, Körperfett, Umfänge und Testergebnisse
• KI-Einschätzung nach jeder Messung: Vergleich mit der letzten Messung, Hinweise und nächster Trainingsfokus
• Transformations-Karte als Story für Instagram oder WhatsApp

■ TERMINE, PAKETE & ZAHLUNGEN
• Kalender mit wiederkehrenden Terminen und Erinnerungen
• Messintervall pro Kunde – überfällige Kunden sofort sichtbar
• Pakete mit verbleibenden Einheiten, Gültigkeit und offenen Beträgen
• Termine mit einem Tipp in den Telefonkalender übernehmen
• Fertige WhatsApp-Nachrichten: Terminerinnerung, Paketende, Zahlung
• Homescreen-Widget mit den heutigen Terminen

■ FÜR DICH GEMACHT
• kg/cm oder lb/in – deine Daten bleiben immer korrekt
• 7 Sprachen, Dunkelmodus, iPhone und iPad

■ PLÄNE
Kostenlos mit bis zu 5 Kunden. Mit Premium verwaltest du mehr Kunden und schaltest KI-Einschätzungen sowie die Paket- und Zahlungsverwaltung frei:
• Core – bis zu 10 Kunden
• Pro – bis zu 30 Kunden
• Studio – unbegrenzt Kunden
Monatlich oder jährlich. Das Abo verlängert sich automatisch, wenn es nicht spätestens 24 Stunden vor Ablauf des Zeitraums gekündigt wird. Die Zahlung erfolgt über deine Apple-ID; Verwaltung und Kündigung in den Einstellungen deines Apple-Accounts.

AthleTrack ist ein Werkzeug für Trainer und ersetzt keine ärztliche Diagnose oder Beratung.

Nutzungsbedingungen: https://www.athletrackai.com/en/terms-of-service
Datenschutz: https://www.athletrackai.com/en/privacy-policy
```

---

## 🇪🇸 İspanyolca — Spanish (Spain) (`es-ES`)

**Ad:** `AthleTrack Entrenador Personal` (30/30 — iki nokta koyunca 31 oluyor, sığmıyor)

**Alt başlık:** `Clientes, mediciones y citas` (28/30)

**Anahtar kelimeler:** `composicion,corporal,bioimpedancia,grasa,perimetros,anamnesis,parq,pruebas,bonos,gimnasio,alumnos` (97/100)

**Promosyon metni:**
```
Nuevo: control de bonos y sesiones. Sesiones restantes, pagos y citas en un solo lugar, y un widget con las citas de hoy en tu pantalla de inicio.
```

**What's New (1.3):**
```
• Gestión de bonos y sesiones: sesiones restantes, pagos y notas de sesión
• Análisis con IA tras cada medición
• Tarjeta de transformación para compartir
• Widget de pantalla de inicio con las citas de hoy
• Citas en el calendario del teléfono y mensajes de WhatsApp listos
• Ahora en español, alemán, portugués, francés e italiano
• kg/cm o lb/in, a tu elección
• Diseño para iPad y muchas mejoras
```

**Açıklama:**
```
La app todo en uno para entrenadores personales: alta de clientes con PAR-Q, composición corporal, perímetros, pruebas físicas, citas, bonos y pagos. Sin Excel ni papeles.

AthleTrack sustituye las fichas en papel y las hojas de cálculo por un perfil de cliente claro. De un vistazo ves cómo progresa cada cliente, cuándo le toca la próxima medición y cuántas sesiones le quedan en el bono.

■ ALTA DE CLIENTES
• Cuestionario PAR-Q con aviso de alta médica
• Objetivos, experiencia, sueño, estrés, alimentación y contacto de emergencia
• Lesiones, cirugías y medicación siempre a mano

■ MEDICIONES Y PRUEBAS
• Composición corporal (p. ej., Tanita / bioimpedancia): peso, grasa, masa muscular, grasa visceral, edad metabólica
• Perímetros con cinta métrica, índice cintura-cadera, presión arterial en reposo
• Análisis postural estático y test de sentadilla overhead
• Sit and Reach, flexiones, abdominales, plancha, sentadilla isométrica, sentadilla 1RM
• Test del escalón YMCA, protocolo de Bruce, FC objetivo Karvonen, VO₂máx
• Valoración automática por edad y sexo según tablas de normas publicadas

■ PROGRESO E IA
• Gráficos de evolución de peso, grasa, perímetros y resultados de pruebas
• Análisis con IA tras cada medición: comparación con la anterior, puntos de atención y próximo enfoque
• Tarjeta de transformación para historias de Instagram o WhatsApp

■ CITAS, BONOS Y PAGOS
• Calendario con citas recurrentes y recordatorios
• Intervalo de medición por cliente: ves al instante quién va atrasado
• Bonos con sesiones restantes, caducidad e importes pendientes
• Pasa las citas al calendario del teléfono con un toque
• Mensajes de WhatsApp listos: recordatorio de cita, fin de bono, pago
• Widget de pantalla de inicio con las citas de hoy

■ HECHA PARA TI
• kg/cm o lb/in: tus datos siempre correctos
• 7 idiomas, modo oscuro, iPhone y iPad

■ PLANES
Gratis hasta 5 clientes. Con Premium gestionas más clientes y desbloqueas el análisis con IA y la gestión de bonos y pagos:
• Core – hasta 10 clientes
• Pro – hasta 30 clientes
• Studio – clientes ilimitados
Mensual o anual. La suscripción se renueva automáticamente salvo que se cancele al menos 24 horas antes del final del periodo. El cobro se realiza en tu Apple ID; puedes gestionarla o cancelarla en los ajustes de tu cuenta de Apple.

AthleTrack es una herramienta para entrenadores y no sustituye el diagnóstico ni el consejo médico.

Términos de uso: https://www.athletrackai.com/en/terms-of-service
Privacidad: https://www.athletrackai.com/en/privacy-policy
```

---

## 🇧🇷 Portekizce — Portuguese (Brazil) (`pt-BR`)

**Ad:** `AthleTrack: Avaliação Física` (28/30)

**Alt başlık:** `Personal Trainer e Alunos` (25/30)

**Anahtar kelimeler:** `bioimpedancia,anamnese,perimetria,composicao,corporal,gordura,parq,agenda,pacotes,aulas,academia` (96/100)

**Promosyon metni:**
```
Novo: controle de pacotes e sessões! Aulas restantes, pagamentos e agendamentos em um só lugar, e um widget com os horários de hoje na tela inicial.
```

**What's New (1.3):**
```
• Controle de pacotes e sessões: aulas restantes, pagamentos e notas da sessão
• Análise com IA após cada avaliação
• Cartão de transformação para compartilhar
• Widget na tela inicial com os agendamentos de hoje
• Agendamentos na agenda do celular e mensagens prontas de WhatsApp
• Agora em português, alemão, espanhol, francês e italiano
• kg/cm ou lb/in, você escolhe
• Layout para iPad e várias melhorias
```

**Açıklama:**
```
O app completo para personal trainers: anamnese com PAR-Q, avaliação física, bioimpedância, perimetria, testes físicos, agenda, pacotes e pagamentos. Sem planilha e sem papel.

O AthleTrack troca fichas de papel e planilhas por um perfil de aluno organizado. Em segundos você vê a evolução de cada aluno, quando vence a próxima avaliação e quantas aulas restam no pacote.

■ ANAMNESE
• Questionário PAR-Q com alerta de liberação médica
• Objetivos, experiência, sono, estresse, alimentação e contato de emergência
• Lesões, cirurgias e medicamentos sempre à mão

■ AVALIAÇÃO FÍSICA
• Composição corporal (ex.: Tanita / bioimpedância): peso, % de gordura, massa muscular, gordura visceral, idade metabólica
• Perimetria com fita métrica, relação cintura-quadril, pressão arterial de repouso
• Avaliação postural estática e teste de agachamento overhead
• Sentar e alcançar, flexões, abdominais, prancha, agachamento isométrico, agachamento 1RM
• Teste do degrau YMCA, protocolo de Bruce, FC alvo de Karvonen, VO₂máx
• Classificação automática por idade e sexo com base em tabelas normativas publicadas

■ EVOLUÇÃO E IA
• Gráficos de evolução de peso, gordura, medidas e testes
• Análise com IA após cada avaliação: comparação com a anterior, pontos de atenção e próximo foco do treino
• Cartão de transformação para stories no Instagram ou WhatsApp

■ AGENDA, PACOTES E PAGAMENTOS
• Agenda com horários recorrentes e lembretes
• Intervalo de reavaliação por aluno: veja na hora quem está atrasado
• Pacotes com aulas restantes, validade e valores em aberto
• Envie os horários para a agenda do celular com um toque
• Mensagens prontas de WhatsApp: lembrete de aula, fim do pacote, pagamento
• Widget na tela inicial com os agendamentos de hoje

■ FEITO PARA VOCÊ
• kg/cm ou lb/in: seus dados sempre corretos
• 7 idiomas, modo escuro, iPhone e iPad

■ PLANOS
Grátis para até 5 alunos. Com o Premium você gerencia mais alunos e libera a análise com IA e o controle de pacotes e pagamentos:
• Core – até 10 alunos
• Pro – até 30 alunos
• Studio – alunos ilimitados
Mensal ou anual. A assinatura é renovada automaticamente, a menos que seja cancelada pelo menos 24 horas antes do fim do período. A cobrança é feita no seu ID Apple; gerencie ou cancele nos ajustes da sua conta Apple.

O AthleTrack é uma ferramenta para profissionais de educação física e não substitui diagnóstico ou orientação médica.

Termos de uso: https://www.athletrackai.com/en/terms-of-service
Privacidade: https://www.athletrackai.com/en/privacy-policy
```

---

## 🇫🇷 Fransızca — French (`fr-FR`)

**Ad:** `AthleTrack: Coach Sportif` (25/30)

**Alt başlık:** `Clients, bilans et rendez-vous` (30/30)

**Anahtar kelimeler:** `corporelle,impedancemetre,masse,grasse,mensurations,suivi,poids,parq,seances,forfaits,musculation` (97/100)

**Promosyon metni:**
```
Nouveau : suivi des forfaits et des séances ! Séances restantes, paiements et rendez-vous au même endroit, plus un widget avec vos séances du jour.
```

**What's New (1.3):**
```
• Forfaits et séances : séances restantes, paiements, notes de séance
• Analyse IA après chaque mesure
• Carte de transformation à partager
• Widget d'écran d'accueil avec les rendez-vous du jour
• Rendez-vous dans le calendrier du téléphone et messages WhatsApp prêts à l'emploi
• Désormais en français, allemand, espagnol, portugais et italien
• kg/cm ou lb/in, au choix
• Mise en page iPad et nombreuses améliorations
```

**Açıklama:**
```
L'app tout-en-un des coachs sportifs : bilan d'entrée avec PAR-Q, composition corporelle, mensurations, tests physiques, rendez-vous, forfaits et paiements. Fini Excel et les fiches papier.

AthleTrack remplace les fiches papier et les tableurs par un profil client clair. En un coup d'œil, vous voyez la progression de chaque client, la date de la prochaine mesure et le nombre de séances restantes sur son forfait.

■ BILAN D'ENTRÉE
• Questionnaire PAR-Q avec alerte d'avis médical
• Objectifs, expérience, sommeil, stress, alimentation, contact d'urgence
• Blessures, opérations et traitements toujours à portée de main

■ MESURES ET TESTS
• Composition corporelle (ex. Tanita / impédancemétrie) : poids, masse grasse, masse musculaire, graisse viscérale, âge métabolique
• Mensurations au mètre ruban, rapport taille/hanches, tension artérielle au repos
• Analyse posturale statique et test Overhead Squat
• Sit and Reach, pompes, abdos, gainage, chaise, squat 1RM
• Step test YMCA, protocole de Bruce, FC cible de Karvonen, VO₂max
• Évaluation automatique selon l'âge et le sexe à partir de tables de normes publiées

■ PROGRESSION ET IA
• Courbes d'évolution du poids, de la masse grasse, des mensurations et des tests
• Analyse IA après chaque mesure : comparaison avec la précédente, points à surveiller et prochain objectif
• Carte de transformation en story pour Instagram ou WhatsApp

■ RENDEZ-VOUS, FORFAITS ET PAIEMENTS
• Calendrier avec rendez-vous récurrents et rappels
• Fréquence de mesure par client : les retards sautent aux yeux
• Forfaits avec séances restantes, validité et reste à payer
• Ajout des rendez-vous au calendrier du téléphone en un geste
• Messages WhatsApp prêts : rappel de séance, fin de forfait, paiement
• Widget d'écran d'accueil avec les rendez-vous du jour

■ PENSÉE POUR VOUS
• kg/cm ou lb/in : vos données restent toujours exactes
• 7 langues, mode sombre, iPhone et iPad

■ FORMULES
Gratuit jusqu'à 5 clients. Avec Premium, gérez plus de clients et débloquez l'analyse IA ainsi que la gestion des forfaits et paiements :
• Core – jusqu'à 10 clients
• Pro – jusqu'à 30 clients
• Studio – clients illimités
Mensuel ou annuel. L'abonnement se renouvelle automatiquement sauf résiliation au moins 24 heures avant la fin de la période. Le paiement est débité sur votre identifiant Apple ; gérez ou résiliez l'abonnement dans les réglages de votre compte Apple.

AthleTrack est un outil pour les coachs et ne remplace pas un diagnostic ou un avis médical.

Conditions d'utilisation : https://www.athletrackai.com/en/terms-of-service
Confidentialité : https://www.athletrackai.com/en/privacy-policy
```

---

## 🇮🇹 İtalyanca — Italian (`it`)

**Ad:** `AthleTrack: Personal Trainer` (28/30)

**Alt başlık:** `Clienti, misure e appuntamenti` (30/30)

**Anahtar kelimeler:** `gestione,schede,composizione,corporea,bioimpedenza,circonferenze,anamnesi,parq,palestra,allenamento` (99/100)

**Promosyon metni:**
```
Novità: gestione di pacchetti e sedute! Sedute rimanenti, pagamenti e appuntamenti in un unico posto, più un widget con gli appuntamenti di oggi.
```

**What's New (1.3):**
```
• Gestione pacchetti e sedute: sedute rimanenti, pagamenti, note di seduta
• Analisi IA dopo ogni misurazione
• Card trasformazione da condividere
• Widget per la Home con gli appuntamenti di oggi
• Appuntamenti nel calendario del telefono e messaggi WhatsApp pronti
• Ora in italiano, tedesco, spagnolo, portoghese e francese
• kg/cm o lb/in, a tua scelta
• Layout per iPad e tanti miglioramenti
```

**Açıklama:**
```
L'app tutto in uno per personal trainer: anamnesi con PAR-Q, composizione corporea, circonferenze, test fisici, appuntamenti, pacchetti e pagamenti. Addio a Excel e moduli cartacei.

AthleTrack sostituisce schede cartacee e fogli di calcolo con un profilo cliente chiaro. A colpo d'occhio vedi i progressi di ogni cliente, quando è prevista la prossima misurazione e quante sedute restano nel pacchetto.

■ ANAMNESI
• Questionario PAR-Q con avviso di nulla osta medico
• Obiettivi, esperienza, sonno, stress, alimentazione, contatto di emergenza
• Infortuni, interventi e farmaci sempre a portata di mano

■ MISURAZIONI E TEST
• Composizione corporea (es. Tanita / bioimpedenza): peso, grasso, massa muscolare, grasso viscerale, età metabolica
• Circonferenze con metro a nastro, rapporto vita-fianchi, pressione a riposo
• Analisi posturale statica e test Overhead Squat
• Sit and Reach, piegamenti, addominali, plank, wall sit, squat 1RM
• Step test YMCA, protocollo di Bruce, FC target Karvonen, VO₂max
• Valutazione automatica per età e sesso in base a tabelle normative pubblicate

■ PROGRESSI E IA
• Grafici dell'andamento di peso, grasso, circonferenze e test
• Analisi IA dopo ogni misurazione: confronto con la precedente, punti di attenzione e prossimo focus
• Card trasformazione per storie su Instagram o WhatsApp

■ APPUNTAMENTI, PACCHETTI E PAGAMENTI
• Calendario con appuntamenti ricorrenti e promemoria
• Intervallo di misurazione per cliente: vedi subito chi è in ritardo
• Pacchetti con sedute rimanenti, scadenza e importi da saldare
• Appuntamenti nel calendario del telefono con un tocco
• Messaggi WhatsApp pronti: promemoria, fine pacchetto, pagamento
• Widget per la Home con gli appuntamenti di oggi

■ PENSATA PER TE
• kg/cm o lb/in: i tuoi dati restano sempre corretti
• 7 lingue, modalità scura, iPhone e iPad

■ PIANI
Gratis fino a 5 clienti. Con Premium gestisci più clienti e sblocchi l'analisi IA e la gestione di pacchetti e pagamenti:
• Core – fino a 10 clienti
• Pro – fino a 30 clienti
• Studio – clienti illimitati
Mensile o annuale. L'abbonamento si rinnova automaticamente se non viene disdetto almeno 24 ore prima della fine del periodo. Il pagamento è addebitato sul tuo ID Apple; puoi gestirlo o disdirlo nelle impostazioni del tuo account Apple.

AthleTrack è uno strumento per trainer e non sostituisce diagnosi o consigli medici.

Termini di utilizzo: https://www.athletrackai.com/en/terms-of-service
Privacy: https://www.athletrackai.com/en/privacy-policy
```

---

## Ekran görüntüleri

Ekran görüntüsünü ben üretemiyorum; ama her dil için hazır başlık metinleri ve
nasıl çekeceğin aşağıda.

**Nasıl çekilir (dil başına ~10 dk):**
1. Simülatörde **iPhone 17 Pro Max** (6.9", 1320×2868 — zorunlu boyut) ve
   iPad için **iPad Pro 13"** (2064×2752) aç. iPad düzeni olduğu için iPad
   görüntüsü de yükle.
2. Uygulamada **Ayarlar → Dil** ile dili değiştir. Ekrandaki her şey o dile geçer.
3. Demo hesapta gerçekçi isimler kullan (örn. DE: Lena Schmidt, ES: Lucía
   García, BR: Ana Souza, FR: Camille Martin, IT: Giulia Rossi). Türkçe
   isimler yabancı mağazada güven kırar.
4. ABD dışı bu 5 ülkenin hepsi metrik; **kg/cm** kalsın. Para birimi: DE/ES/FR/IT
   **€**, BR **R$**.
5. Simülatörde `⌘S` ile kaydet, sonra başlık metnini (aşağıda) Figma/Canva'da
   üstüne yaz. Mevcut TR/EN kare tasarımını şablon olarak kullan.
6. ASC'de her dilin sayfasında "App Previews and Screenshots" alanına sürükle.
   Bir dile yüklemezsen ana dilin (İngilizce) görselleri gösterilir.

**Kare sırası:** İlk 3 kare en önemlisi (arama sonucunda sadece onlar görünür).

| # | Ekran | 🇩🇪 DE | 🇪🇸 ES | 🇧🇷 PT-BR | 🇫🇷 FR | 🇮🇹 IT |
|---|---|---|---|---|---|---|
| 1 | Öğrenci detay — gelişim grafiği | Jeder Fortschritt auf einen Blick | El progreso de cada cliente, de un vistazo | A evolução de cada aluno em uma tela | La progression de chaque client en un coup d'œil | I progressi di ogni cliente a colpo d'occhio |
| 2 | Paket kartı (kalan seans + ödeme) | Einheiten & Zahlungen im Griff | Sesiones y pagos bajo control | Aulas e pagamentos sob controle | Séances et paiements sous contrôle | Sedute e pagamenti sotto controllo |
| 3 | Testler — gauge kartları | Profi-Tests mit Normwerten | Pruebas profesionales con normas | Testes profissionais com tabelas normativas | Tests pros avec normes de référence | Test professionali con valori normativi |
| 4 | AI yorumu kartı | KI-Einschätzung nach jeder Messung | Análisis con IA tras cada medición | Análise com IA após cada avaliação | Analyse IA après chaque mesure | Analisi IA dopo ogni misurazione |
| 5 | Takvim + widget | Dein Tag – auch auf dem Homescreen | Tu día, también en la pantalla de inicio | Seu dia também na tela inicial | Votre journée, aussi sur l'écran d'accueil | La tua giornata, anche sulla Home |
| 6 | Dönüşüm kartı | Erfolge teilen mit einem Tipp | Comparte resultados con un toque | Compartilhe resultados com um toque | Partagez les résultats en un geste | Condividi i risultati con un tocco |
| 7 | Yeni öğrenci / PAR-Q | Kundenaufnahme mit PAR-Q | Alta de clientes con PAR-Q | Anamnese com PAR-Q | Bilan d'entrée avec PAR-Q | Anamnesi con PAR-Q |

---

## Son kontrol

- [ ] 5 dil "App Information"a eklendi (ad + alt başlık)
- [ ] 1.3 sürüm sayfasında 5 dilin açıklama, anahtar kelime, promosyon metni ve What's New alanları dolu
- [ ] Destek URL'si ve pazarlama URL'si her dilde dolu (İngilizcedeki ile aynı olabilir)
- [ ] Ekran görüntüleri (en az 6.9" iPhone; iPad önerilir)
- [ ] Abonelik ürünlerinin (Core/Pro/Studio) "Localization" kısmına da bu 5 dilde görünen ad + açıklama ekle. Örnek: `Pro – bis zu 30 Kunden` / `Pro – hasta 30 clientes` / `Pro – até 30 alunos` / `Pro – jusqu'à 30 clients` / `Pro – fino a 30 clienti`
- [ ] Yasal sayfalar sitede sadece TR/EN; açıklamalardaki linkler İngilizce sayfaya gidiyor
