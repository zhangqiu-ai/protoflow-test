import XCTest
@testable import ProtoFlowTasks

final class TaskValidationTests: XCTestCase {
    func testEmptyNameIsRejected() {
        XCTAssertNil(validTaskName(""))
    }

    func testWhitespaceOnlyNameIsRejected() {
        XCTAssertNil(validTaskName("   "))
        XCTAssertNil(validTaskName(" \t\n "))
    }

    func testPaddedNameIsTrimmed() {
        XCTAssertEqual(validTaskName("  Buy milk \n"), "Buy milk")
    }

    func testNormalNameIsUnchanged() {
        XCTAssertEqual(validTaskName("Buy milk"), "Buy milk")
    }
}
