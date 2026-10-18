package dev.protoflow.examples.tasks

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TaskValidationTest {
    @Test fun emptyNameIsRejected() {
        assertNull(validTaskName(""))
    }

    @Test fun whitespaceOnlyNameIsRejected() {
        assertNull(validTaskName("   "))
        assertNull(validTaskName("\t \n"))
    }

    @Test fun paddedNameIsTrimmed() {
        assertEquals("Write tests", validTaskName("  Write tests  "))
    }

    @Test fun normalNameIsKept() {
        assertEquals("Write tests", validTaskName("Write tests"))
    }
}
