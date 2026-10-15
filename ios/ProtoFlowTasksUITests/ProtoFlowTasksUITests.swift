import XCTest

/// The app's own functional tests (ProtoFlow `functional` for the ios target).
final class ProtoFlowTasksUITests: XCTestCase {
    private func launch(_ screen: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-PROTOFLOW_SCREEN", screen]
        app.launch()
        return app
    }

    func testAddingATaskAppendsItAndClearsTheField() {
        let app = launch("tasks")
        let title = app.staticTexts["tasks.title"]
        XCTAssertTrue(title.waitForExistence(timeout: 5))
        XCTAssertEqual(title.label, "My day")
        let count = app.staticTexts["tasks.count"]
        XCTAssertTrue(count.exists)
        XCTAssertEqual(count.label, "2 tasks")
        let input = app.textFields["tasks.input"]
        input.tap()
        input.typeText("Write tests")
        app.buttons["tasks.add"].tap()
        XCTAssertEqual(app.staticTexts.matching(identifier: "tasks.item").count, 3)
        XCTAssertTrue(app.staticTexts["Write tests"].exists)
        let countUpdate = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label == %@", "3 tasks"),
            object: count
        )
        XCTAssertEqual(XCTWaiter.wait(for: [countUpdate], timeout: 5), .completed)
        XCTAssertFalse(app.staticTexts["tasks.error"].exists)
        XCTAssertFalse(app.keyboards.firstMatch.exists)
    }

    func testAddingAnEmptyTaskShowsTheError() {
        let app = launch("tasks")
        app.buttons["tasks.add"].tap()
        XCTAssertTrue(app.staticTexts["tasks.error"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts.matching(identifier: "tasks.item").count, 2)
    }

    func testSettingsSaveAndNavigation() {
        let app = launch("settings")
        app.switches["settings.notify-toggle"].tap()
        app.buttons["settings.save"].tap()
        XCTAssertTrue(app.staticTexts["settings.saved"].waitForExistence(timeout: 5))
        app.buttons["settings.back"].tap()
        XCTAssertTrue(app.staticTexts["tasks.title"].waitForExistence(timeout: 5))
    }

    func testAboutDetailsAndNavigation() {
        let app = launch("about")
        XCTAssertTrue(app.otherElements["about"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.otherElements["about.header"].waitForExistence(timeout: 5))
        XCTAssertEqual(app.staticTexts["about.title"].label, "About")
        XCTAssertEqual(app.buttons["about.back"].label, "Back")
        XCTAssertEqual(app.staticTexts["about.summary"].label, "Tasks keeps today's work in one list.")
        XCTAssertEqual(app.staticTexts["about.version"].label, "Version 1.0")
        XCTAssertEqual(app.buttons["about.more"].label, "Show details")
        XCTAssertFalse(app.staticTexts["about.details"].exists)

        app.buttons["about.more"].tap()
        let details = app.staticTexts["about.details"]
        XCTAssertTrue(details.waitForExistence(timeout: 5))
        XCTAssertEqual(details.label, "Built from a ProtoFlow prototype.")
        XCTAssertEqual(app.buttons["about.more"].label, "Hide details")

        app.buttons["about.more"].tap()
        XCTAssertFalse(details.exists)
        XCTAssertEqual(app.buttons["about.more"].label, "Show details")

        app.buttons["about.back"].tap()
        XCTAssertTrue(app.staticTexts["tasks.title"].waitForExistence(timeout: 5))
    }
}
