package dev.protoflow.examples.tasks

/** Trims a task name and rejects an empty result. */
fun validTaskName(draft: String): String? = draft.trim().takeIf { it.isNotEmpty() }
