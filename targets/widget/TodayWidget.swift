import SwiftUI
import WidgetKit

// ─────────────────────────────────────────────────────────────
// iOS ana ekran / kilit ekranı widget'ı: bugünkü seanslar + takip özeti.
//
// Veri, uygulamanın App Group'a yazdığı JSON "snapshot"tan gelir
// (services/widgetData.ts). Widget ağa çıkmaz. Snapshot önümüzdeki 7 günün
// randevularını taşıdığı için gün değişince widget kendi kendine doğru günü
// gösterir; uygulama açıldıkça veri tazelenir.
// Android karşılığı: widgets/android/TodayWidget.tsx
// ─────────────────────────────────────────────────────────────

private let appGroup = "group.com.athletrack.athletrack"
private let snapshotKey = "snapshot"

// MARK: - Model

struct WidgetAppointment: Codable, Hashable {
    let ts: Double
    let name: String
    /// Öğrenci kimliği — dokununca öğrencinin sayfası açılır.
    let sid: String?
    /// "3 ders kaldı" (yalnızca premium + aktif paket).
    let left: String?
    var date: Date { Date(timeIntervalSince1970: ts / 1000) }
}

struct WidgetStudentRow: Codable, Hashable {
    let sid: String
    let name: String
    let detail: String?
}

struct WidgetLabels: Codable {
    let title: String
    let today: String
    let noSessions: String
    let overdue: String
    let dueSoon: String
    let activeStudents: String
    let signedOut: String
    let more: String
    // Sonradan eklenenler: eski snapshot'ta yok, bu yüzden opsiyonel.
    let next: String?
    let packagesEnding: String?
    let unpaid: String?
    let thisWeek: String?
    let overdueTitle: String?
    let endingTitle: String?
    let allClear: String?
}

struct WidgetSnapshot: Codable {
    let signedIn: Bool
    let updatedAt: Double
    let appointments: [WidgetAppointment]
    let overdue: Int
    let dueSoon: Int
    let activeStudents: Int
    // Sonradan eklenenler (eski uygulama sürümünün yazdığı snapshot'ta yok).
    let premium: Bool?
    let packagesEnding: Int?
    let unpaidText: String?
    let weekText: String?
    let overdueList: [WidgetStudentRow]?
    let endingList: [WidgetStudentRow]?
    let labels: WidgetLabels
    let locale: String

    static func load() -> WidgetSnapshot? {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let raw = defaults.string(forKey: snapshotKey),
            let data = raw.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }

    static let placeholder = WidgetSnapshot(
        signedIn: true,
        updatedAt: Date().timeIntervalSince1970 * 1000,
        appointments: [
            WidgetAppointment(ts: Date().addingTimeInterval(3600).timeIntervalSince1970 * 1000, name: "Ayşe K.", sid: nil, left: nil),
            WidgetAppointment(ts: Date().addingTimeInterval(7200).timeIntervalSince1970 * 1000, name: "Mehmet Y.", sid: nil, left: nil),
            WidgetAppointment(ts: Date().addingTimeInterval(10800).timeIntervalSince1970 * 1000, name: "Zeynep D.", sid: nil, left: nil),
        ],
        overdue: 2,
        dueSoon: 3,
        activeStudents: 12,
        premium: false,
        packagesEnding: nil,
        unpaidText: nil,
        weekText: nil,
        overdueList: [
            WidgetStudentRow(sid: "", name: "Can Ö.", detail: nil),
            WidgetStudentRow(sid: "", name: "Elif S.", detail: nil),
        ],
        endingList: nil,
        labels: WidgetText.placeholderLabels,
        locale: WidgetText.lang
    )
}

// MARK: - Yerel metinler
// Uygulama snapshot'ı kendi dilinde yazar (services/widgetData.ts). Buradakiler
// yalnızca widget galerisi ve önizleme için: uygulama henüz veri yazmadan önce.
// Dil cihazın tercih ettiği ilk dilden seçilir; desteklenmeyen dilde İngilizce.

enum WidgetText {
    static let lang: String = {
        let code = String((Locale.preferredLanguages.first ?? "en").prefix(2))
        return ["tr", "en", "de", "es", "pt", "fr", "it"].contains(code) ? code : "en"
    }()

    static let description: String = [
        "tr": "Bugünkü seanslar ve takibi yaklaşan öğrenciler.",
        "en": "Today's sessions and clients due for a check-in.",
        "de": "Heutige Termine und Kunden, bei denen eine Messung ansteht.",
        "es": "Las citas de hoy y los clientes con medición pendiente.",
        "pt": "Os agendamentos de hoje e os alunos com avaliação pendente.",
        "fr": "Les séances du jour et les clients à mesurer bientôt.",
        "it": "Gli appuntamenti di oggi e i clienti con misurazione in arrivo.",
    ][lang]!

    /// Uygulama henüz hiç veri yazmadıysa (yeni kurulum / App Group okunamıyor).
    static let noData: String = [
        "tr": "Günü görmek için AthleTrack'i bir kez aç.",
        "en": "Open AthleTrack once to load your day.",
        "de": "Öffne AthleTrack einmal, um deinen Tag zu laden.",
        "es": "Abre AthleTrack una vez para cargar tu día.",
        "pt": "Abra o AthleTrack uma vez para carregar seu dia.",
        "fr": "Ouvrez AthleTrack une fois pour charger votre journée.",
        "it": "Apri AthleTrack una volta per caricare la tua giornata.",
    ][lang]!

    static let placeholderLabels: WidgetLabels = {
        // title, today, noSessions, overdue, dueSoon, activeStudents, signedOut, more
        let t: [String: [String]] = [
            "tr": ["Takip", "Bugün", "Bugün seans yok", "gecikmiş", "yaklaşan", "aktif öğrenci", "Görmek için uygulamada giriş yapın", "daha"],
            "en": ["Follow-up", "Today", "No sessions today", "overdue", "due soon", "active clients", "Sign in to the app to see your day", "more"],
            "de": ["Messungen", "Heute", "Heute keine Termine", "überfällig", "bald fällig", "aktive Kunden", "Melde dich in der App an, um deinen Tag zu sehen", "weitere"],
            "es": ["Mediciones", "Hoy", "Hoy no hay citas", "atrasadas", "próximas", "clientes activos", "Inicia sesión en la app para ver tu día", "más"],
            "pt": ["Avaliações", "Hoje", "Nenhum agendamento hoje", "atrasadas", "em breve", "alunos ativos", "Entre no app para ver seu dia", "a mais"],
            "fr": ["Mesures", "Aujourd'hui", "Aucun rendez-vous aujourd'hui", "en retard", "bientôt", "clients actifs", "Connectez-vous à l'app pour voir votre journée", "de plus"],
            "it": ["Misurazioni", "Oggi", "Nessun appuntamento oggi", "in ritardo", "a breve", "clienti attivi", "Accedi all'app per vedere la tua giornata", "altri"],
        ]
        let v = t[lang]!
        return WidgetLabels(
            title: v[0], today: v[1], noSessions: v[2], overdue: v[3],
            dueSoon: v[4], activeStudents: v[5], signedOut: v[6], more: v[7],
            next: nil, packagesEnding: nil, unpaid: nil, thisWeek: nil,
            overdueTitle: nil, endingTitle: nil, allClear: nil
        )
    }()
}

// MARK: - Timeline

struct TodayEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?

    /// Bu girişin günündeki, henüz bitmemiş (1 saat tolerans) seanslar.
    var todaysAppointments: [WidgetAppointment] {
        guard let snapshot else { return [] }
        let cal = Calendar.current
        return snapshot.appointments.filter { cal.isDate($0.date, inSameDayAs: date) }
    }

    var upcomingToday: [WidgetAppointment] {
        todaysAppointments.filter { $0.date.addingTimeInterval(3600) >= date }
    }
}

struct TodayProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayEntry {
        TodayEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayEntry) -> Void) {
        completion(TodayEntry(date: Date(), snapshot: context.isPreview ? .placeholder : (WidgetSnapshot.load() ?? .placeholder)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayEntry>) -> Void) {
        let snapshot = WidgetSnapshot.load()
        let now = Date()
        let cal = Calendar.current

        // Her seans bittiğinde (1 saat sonra) ve gece yarısı listeyi kaydırmak için giriş üret.
        var dates: Set<Date> = [now]
        for apt in snapshot?.appointments ?? [] {
            let end = apt.date.addingTimeInterval(3600)
            if end > now && end < now.addingTimeInterval(24 * 3600) { dates.insert(end) }
        }
        if let midnight = cal.nextDate(after: now, matching: DateComponents(hour: 0, minute: 0), matchingPolicy: .nextTime) {
            dates.insert(midnight)
        }

        let entries = dates.sorted().prefix(30).map { TodayEntry(date: $0, snapshot: snapshot) }
        completion(Timeline(entries: Array(entries), policy: .after(now.addingTimeInterval(6 * 3600))))
    }
}

// MARK: - Views

private let calendarURL = URL(string: "ptreactnative://calendar?source=widget")!
private let overdueURL = URL(string: "ptreactnative://calendar?source=widget&filter=overdue")!
private let dueSoonURL = URL(string: "ptreactnative://calendar?source=widget&filter=dueSoon")!
private let homeURL = URL(string: "ptreactnative://?source=widget")!

/// Öğrencinin sayfası; kimlik yoksa takvim.
private func studentURL(_ sid: String?) -> URL {
    guard let sid, !sid.isEmpty,
          let encoded = sid.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
          let url = URL(string: "ptreactnative://student/\(encoded)?source=widget")
    else { return calendarURL }
    return url
}

private func timeString(_ date: Date, locale: String) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: locale)
    f.dateFormat = "HH:mm"
    return f.string(from: date)
}

struct CountChip: View {
    let value: Int
    let label: String
    let color: Color

    var body: some View {
        HStack(spacing: 3) {
            Text("\(value)").font(.caption.weight(.heavy))
            Text(label).font(.caption2.weight(.semibold)).lineLimit(1)
        }
        .foregroundStyle(value > 0 ? color : Color("textMuted"))
        .padding(.horizontal, 7)
        .padding(.vertical, 3)
        .background(Color("chip"), in: Capsule())
    }
}

struct AppointmentRow: View {
    let apt: WidgetAppointment
    let locale: String
    var showLeft = false

    var body: some View {
        HStack(spacing: 6) {
            Text(timeString(apt.date, locale: locale))
                .font(.caption.weight(.bold).monospacedDigit())
                .foregroundStyle(Color.accentColor)
            Text(apt.name)
                .font(.caption)
                .foregroundStyle(Color("textPrimary"))
                .lineLimit(1)
            if showLeft, let left = apt.left {
                Spacer(minLength: 2)
                Text(left).font(.caption2).foregroundStyle(Color("textMuted")).lineLimit(1)
            }
        }
    }
}

/// Sıradaki seans: büyük saat + isim (+ kalan ders).
struct NextCard: View {
    let apt: WidgetAppointment
    let label: String
    let locale: String

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(label.uppercased()).font(.system(size: 9, weight: .heavy)).foregroundStyle(Color("textMuted"))
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(timeString(apt.date, locale: locale))
                    .font(.title3.weight(.heavy).monospacedDigit())
                    .foregroundStyle(Color.accentColor)
                Text(apt.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color("textPrimary"))
                    .lineLimit(1)
            }
            if let left = apt.left {
                Text(left).font(.caption2.weight(.semibold)).foregroundStyle(Color("warning")).lineLimit(1)
            }
        }
    }
}

/// Büyük widget'taki öğrenci listesi satırı.
struct StudentRow: View {
    let row: WidgetStudentRow
    let color: Color

    var body: some View {
        Link(destination: studentURL(row.sid)) {
            HStack(spacing: 6) {
                Circle().fill(color).frame(width: 6, height: 6)
                Text(row.name).font(.caption).foregroundStyle(Color("textPrimary")).lineLimit(1)
                Spacer(minLength: 2)
                if let d = row.detail {
                    Text(d).font(.caption2).foregroundStyle(Color("textMuted")).lineLimit(1)
                }
            }
        }
    }
}

struct SignedOutView: View {
    let message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("AthleTrack").font(.headline).foregroundStyle(Color.accentColor)
            Text(message).font(.caption).foregroundStyle(Color("textMuted"))
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct TodayWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: TodayEntry

    var body: some View {
        Group {
            if let s = entry.snapshot, s.signedIn {
                content(s)
            } else {
                // Snapshot yoksa: uygulama henüz yazmadı. Varsa ama signedIn false: çıkış yapılmış.
                SignedOutView(message: entry.snapshot?.labels.signedOut ?? WidgetText.noData)
            }
        }
        .containerBackground(for: .widget) { Color("$widgetBackground") }
        .widgetURL(tapURL)
    }

    /// Widget'ın genel dokunma adresi (tek bir widgetURL olmalı). Orta ve büyük
    /// boyutta satırlar ayrıca kendi Link'leriyle öğrenciye / listeye gider.
    private var tapURL: URL {
        guard entry.snapshot?.signedIn == true else { return homeURL }
        switch family {
        case .systemSmall, .accessoryRectangular, .accessoryCircular:
            // Tek dokunma alanı: sıradaki seansın öğrencisi, yoksa takvim.
            return upcoming.first.map { studentURL($0.sid) } ?? calendarURL
        default:
            return calendarURL
        }
    }

    @ViewBuilder
    private func content(_ s: WidgetSnapshot) -> some View {
        switch family {
        case .accessoryRectangular:
            lockScreen(s)
        case .accessoryCircular:
            lockCircle(s)
        case .systemLarge:
            large(s)
        case .systemMedium:
            medium(s)
        default:
            small(s)
        }
    }

    private var upcoming: [WidgetAppointment] { entry.upcomingToday }

    private func header(_ s: WidgetSnapshot) -> some View {
        HStack {
            Text(s.labels.today).font(.subheadline.weight(.bold)).foregroundStyle(Color("textPrimary"))
            Spacer()
            Text("\(entry.todaysAppointments.count)")
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(Color.accentColor)
        }
    }

    /// Sıradaki seans kartı + ardından gelenlerin listesi. `rows`: kart dışında kaç satır.
    /// `tappable`: küçük widget'ta satır bazlı link desteklenmez.
    private func agenda(_ s: WidgetSnapshot, rows: Int, tappable: Bool) -> some View {
        let items = upcoming
        return VStack(alignment: .leading, spacing: 5) {
            if let first = items.first {
                if tappable {
                    Link(destination: studentURL(first.sid)) {
                        NextCard(apt: first, label: s.labels.next ?? "", locale: s.locale)
                    }
                } else {
                    NextCard(apt: first, label: s.labels.next ?? "", locale: s.locale)
                }
                let rest = Array(items.dropFirst())
                ForEach(rest.prefix(rows), id: \.self) { apt in
                    if tappable {
                        Link(destination: studentURL(apt.sid)) { AppointmentRow(apt: apt, locale: s.locale, showLeft: true) }
                    } else {
                        AppointmentRow(apt: apt, locale: s.locale)
                    }
                }
                if rest.count > rows {
                    Text("+\(rest.count - rows) \(s.labels.more)").font(.caption2).foregroundStyle(Color("textMuted"))
                }
            } else {
                Text(s.labels.noSessions).font(.caption).foregroundStyle(Color("textMuted"))
            }
        }
    }

    private func overdueChip(_ s: WidgetSnapshot) -> some View {
        Link(destination: overdueURL) {
            CountChip(value: s.overdue, label: s.labels.overdue, color: Color("danger"))
        }
    }

    private func endingChip(_ s: WidgetSnapshot) -> some View {
        CountChip(value: s.packagesEnding ?? 0, label: s.labels.packagesEnding ?? "", color: Color("warning"))
    }

    private func unpaidLine(_ s: WidgetSnapshot) -> some View {
        HStack(spacing: 3) {
            Text(s.unpaidText ?? "").font(.caption.weight(.heavy)).foregroundStyle(Color("textPrimary"))
            Text(s.labels.unpaid ?? "").font(.caption2).foregroundStyle(Color("textMuted"))
        }
        .lineLimit(1)
        .minimumScaleFactor(0.8)
    }

    private func isPremium(_ s: WidgetSnapshot) -> Bool { s.premium == true }

    private func small(_ s: WidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            header(s)
            agenda(s, rows: 1, tappable: false)
            Spacer(minLength: 0)
            if isPremium(s), (s.packagesEnding ?? 0) > 0 {
                endingChip(s)
            } else {
                CountChip(value: s.overdue, label: s.labels.overdue, color: Color("danger"))
            }
        }
    }

    private func medium(_ s: WidgetSnapshot) -> some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                header(s)
                agenda(s, rows: 2, tappable: true)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 6) {
                Text(s.labels.title).font(.caption.weight(.bold)).foregroundStyle(Color("textMuted"))
                overdueChip(s)
                Link(destination: dueSoonURL) {
                    CountChip(value: s.dueSoon, label: s.labels.dueSoon, color: Color("warning"))
                }
                if isPremium(s) {
                    endingChip(s)
                    if s.unpaidText != nil { unpaidLine(s) }
                } else {
                    CountChip(value: s.activeStudents, label: s.labels.activeStudents, color: Color.accentColor)
                }
                Spacer(minLength: 0)
            }
        }
    }

    private func large(_ s: WidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            header(s)
            agenda(s, rows: 4, tappable: true)
            Divider()
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Link(destination: overdueURL) {
                        Text(s.labels.overdueTitle ?? s.labels.overdue)
                            .font(.caption.weight(.bold)).foregroundStyle(Color("textMuted"))
                    }
                    let list = s.overdueList ?? []
                    if list.isEmpty {
                        Text(s.labels.allClear ?? "").font(.caption2).foregroundStyle(Color("textMuted"))
                    } else {
                        ForEach(list.prefix(isPremium(s) ? 4 : 6), id: \.self) { StudentRow(row: $0, color: Color("danger")) }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                if isPremium(s) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(s.labels.endingTitle ?? "").font(.caption.weight(.bold)).foregroundStyle(Color("textMuted"))
                        ForEach((s.endingList ?? []).prefix(4), id: \.self) { StudentRow(row: $0, color: Color("warning")) }
                        if s.unpaidText != nil { unpaidLine(s).padding(.top, 2) }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            Spacer(minLength: 0)
            if let week = s.weekText, !week.isEmpty {
                HStack(spacing: 4) {
                    Text(s.labels.thisWeek ?? "").font(.caption2.weight(.bold)).foregroundStyle(Color("textMuted"))
                    Text(week).font(.caption2).foregroundStyle(Color("textPrimary"))
                }
                .lineLimit(1)
            }
        }
    }

    private func lockScreen(_ s: WidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("\(s.labels.today) · \(entry.todaysAppointments.count)").font(.headline)
            if let next = upcoming.first {
                Text("\(timeString(next.date, locale: s.locale)) \(next.name)").font(.caption).lineLimit(1)
            } else {
                Text(s.labels.noSessions).font(.caption).lineLimit(1)
            }
            if s.overdue > 0 {
                Text("\(s.overdue) \(s.labels.overdue)").font(.caption2).lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func lockCircle(_ s: WidgetSnapshot) -> some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Text("\(upcoming.count)").font(.title2.weight(.heavy))
                Text(s.labels.today).font(.system(size: 9, weight: .semibold)).lineLimit(1).minimumScaleFactor(0.6)
            }
        }
    }
}

// MARK: - Widget

struct TodayWidget: Widget {
    // services/widgetData.ts → IOS_WIDGET_KIND ile aynı olmalı (reloadWidget bunu kullanır).
    let kind = "TodayWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayProvider()) { entry in
            TodayWidgetView(entry: entry)
        }
        .configurationDisplayName("AthleTrack")
        .description(WidgetText.description)
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryCircular])
    }
}

@main
struct AthleTrackWidgets: WidgetBundle {
    var body: some Widget {
        TodayWidget()
    }
}
