import SwiftUI

struct AboutScreen: View {
    let open: (String) -> Void
    @State private var detailsVisible = false

    var body: some View {
        ScreenRoot(id: "about") {
            Header(prefix: "about", title: "About", action: "Back") { open("tasks") }
            Text("Tasks keeps today's work in one list.")
                .font(.system(size: 17))
                .padding(.horizontal, 16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .frame(height: 52)
                .background(.white, in: RoundedRectangle(cornerRadius: 12))
                .accessibilityIdentifier("about.summary")
                .padding(.bottom, 16)
            PrimaryButton(title: "Show details", wide: true) { detailsVisible = true }
                .accessibilityIdentifier("about.more")
            if detailsVisible {
                Text("Built from a ProtoFlow prototype.")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.accent)
                    .padding(.top, 12)
                    .accessibilityIdentifier("about.details")
            }
        }
    }
}
