package dev.protoflow.examples.tasks

import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertTextEquals
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** The app's own functional tests (ProtoFlow `functional` for the android target), on the JVM. */
@RunWith(RobolectricTestRunner::class)
class TasksAppTest {
    @get:Rule val compose = createComposeRule()

    @Test fun tasksScreenUsesTheFrozenTitleAndAnchors() {
        compose.setContent { TasksApp("tasks") }

        compose.onNodeWithTag("tasks").assertIsDisplayed()
        compose.onNodeWithTag("tasks.header").assertIsDisplayed()
        compose.onNodeWithTag("tasks.title").assertTextEquals("My day")
        compose.onNodeWithTag("tasks.settings").assertIsDisplayed()
        compose.onNodeWithTag("tasks.list").assertIsDisplayed()
        compose.onAllNodesWithTag("tasks.item").assertCountEquals(2)
        compose.onNodeWithTag("tasks.form").assertIsDisplayed()
        compose.onNodeWithTag("tasks.input").assertIsDisplayed()
        compose.onNodeWithTag("tasks.add").assertIsDisplayed()
    }

    @Test fun addingATaskAppendsIt() {
        compose.setContent { TasksApp("tasks") }
        compose.onNodeWithTag("tasks.input").performTextInput("Write tests")
        compose.onNodeWithTag("tasks.add").performClick()
        compose.onAllNodesWithTag("tasks.item").assertCountEquals(3)
        compose.onNodeWithText("Write tests").assertIsDisplayed()
        compose.onAllNodesWithTag("tasks.error").assertCountEquals(0)
    }

    @Test fun addingAnEmptyTaskShowsTheError() {
        compose.setContent { TasksApp("tasks") }
        compose.onNodeWithTag("tasks.add").performClick()
        compose.onNodeWithTag("tasks.error").assertIsDisplayed()
        compose.onAllNodesWithTag("tasks.item").assertCountEquals(2)
    }

    @Test fun settingsSaveAndNavigation() {
        compose.setContent { TasksApp("settings") }

        compose.onNodeWithTag("settings").assertIsDisplayed()
        compose.onNodeWithTag("settings.header").assertIsDisplayed()
        compose.onNodeWithTag("settings.title").assertTextEquals("Settings")
        compose.onNodeWithTag("settings.back").assertTextEquals("Back")
        compose.onNodeWithTag("settings.notify").assertIsDisplayed()
        compose.onNodeWithText("Daily reminder").assertIsDisplayed()
        compose.onNodeWithTag("settings.notify-toggle").assertIsDisplayed()
        compose.onNodeWithTag("settings.save").assertTextEquals("Save")
        compose.onNodeWithTag("settings.notify-toggle").performClick()
        compose.onNodeWithTag("settings.save").performClick()
        compose.onNodeWithTag("settings.saved").assertIsDisplayed()
        compose.onNodeWithTag("settings.saved").assertTextEquals("Saved.")
        compose.onNodeWithTag("settings.back").performClick()
        compose.onNodeWithTag("tasks.title").assertTextEquals("My day")
    }
}
