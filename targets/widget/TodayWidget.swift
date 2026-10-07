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
    var date: Date { Date(timeIntervalSince1970: ts / 1000) }
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
}

struct WidgetSnapshot: Codable {
    let signedIn: Bool
    let updatedAt: Double
    let appointments: [WidgetAppointment]
    let overdue: Int
    let dueSoon: Int
    let activeStudents: Int
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
            WidgetAppointment(ts: Date().addingTimeInterval(3600).timeIntervalSince1970 * 1000, name: "Ayşe K."),
            WidgetAppointment(ts: Date().addingTimeInterval(7200).timeIntervalSince1970 * 1000, name: "Mehmet Y."),
        ],
        overdue: 2,
        dueSoon: 3,
        activeStudents: 12,
        labels: WidgetLabels(
            title: "AthleTrack",
            today: "Bugün",
            noSessions: "Bugün seans yok",
            overdue: "gecikmiş",
            dueSoon: "yaklaşan",
            activeStudents: "aktif öğrenci",
            signedOut: "Görmek için uygulamada giriş yapın",
            more: "daha"
        ),
        locale: "tr-TR"
    )
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
private let homeURL = URL(string: "ptreactnative://?source=widget")!

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

    var body: some View {
        HStack(spacing: 6) {
            Text(timeString(apt.date, locale: locale))
                .font(.caption.weight(.bold).monospacedDigit())
                .foregroundStyle(Color.accentColor)
            Text(apt.name)
                .font(.caption)
                .foregroundStyle(Color("textPrimary"))
                .lineLimit(1)
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
                SignedOutView(message: entry.snapshot?.labels.signedOut ?? WidgetSnapshot.placeholder.labels.signedOut)
            }
        }
        .containerBackground(for: .widget) { Color("$widgetBackground") }
        .widgetURL(entry.snapshot?.signedIn == true ? calendarURL : homeURL)
    }

    @ViewBuilder
    private func content(_ s: WidgetSnapshot) -> some View {
        switch family {
        case .accessoryRectangular:
            lockScreen(s)
        case .systemMedium:
            medium(s)
        default:
            small(s)
        }
    }

    private func header(_ s: WidgetSnapshot) -> some View {
        HStack {
            Text(s.labels.today).font(.subheadline.weight(.bold)).foregroundStyle(Color("textPrimary"))
            Spacer()
            Text("\(entry.todaysAppointments.count)")
                .font(.subheadline.weight(.heavy))
                .foregroundStyle(Color.accentColor)
        }
    }

    private func list(_ s: WidgetSnapshot, limit: Int) -> some View {
        let items = entry.upcomingToday
        return VStack(alignment: .leading, spacing: 4) {
            if items.isEmpty {
                Text(s.labels.noSessions).font(.caption).foregroundStyle(Color("textMuted"))
            } else {
                ForEach(items.prefix(limit), id: \.self) { AppointmentRow(apt: $0, locale: s.locale) }
                if items.count > limit {
                    Text("+\(items.count - limit) \(s.labels.more)").font(.caption2).foregroundStyle(Color("textMuted"))
                }
            }
        }
    }

    private func small(_ s: WidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            header(s)
            list(s, limit: 3)
            Spacer(minLength: 0)
            CountChip(value: s.overdue, label: s.labels.overdue, color: Color("danger"))
        }
    }

    private func medium(_ s: WidgetSnapshot) -> some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(alignment: .leading, spacing: 8) {
                header(s)
                list(s, limit: 4)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack(alignment: .leading, spacing: 6) {
                Text(s.labels.title).font(.caption.weight(.bold)).foregroundStyle(Color("textMuted"))
                CountChip(value: s.overdue, label: s.labels.overdue, color: Color("danger"))
                CountChip(value: s.dueSoon, label: s.labels.dueSoon, color: Color("warning"))
                CountChip(value: s.activeStudents, label: s.labels.activeStudents, color: Color.accentColor)
                Spacer(minLength: 0)
            }
        }
    }

    private func lockScreen(_ s: WidgetSnapshot) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text("\(s.labels.today) · \(entry.todaysAppointments.count)").font(.headline)
            if let next = entry.upcomingToday.first {
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
        .description("Bugünkü seanslar ve takibi yaklaşan öğrenciler.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular])
    }
}

@main
struct AthleTrackWidgets: WidgetBundle {
    var body: some Widget {
        TodayWidget()
    }
}
