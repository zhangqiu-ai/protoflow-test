// The app's own functional tests (ProtoFlow `functional` for the flutter target).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:protoflow_tasks/main.dart';

Finder byAnchor(String id) => find.byWidgetPredicate(
  (widget) => widget is Semantics && widget.properties.identifier == id,
  description: 'Semantics identifier "$id"',
);

Semantics semanticsFor(WidgetTester tester, String id) =>
    tester.widget<Semantics>(byAnchor(id));

void main() {
  testWidgets('adding a task appends it and clears the field', (tester) async {
    await tester.pumpWidget(const TasksApp(initial: 'tasks'));
    expect(accent, const Color(0xFF4F46E5));
    expect(muted, const Color(0xFF5B6B73));
    expect(byAnchor('tasks'), findsOneWidget);
    expect(byAnchor('tasks.header'), findsOneWidget);
    expect(byAnchor('tasks.title'), findsOneWidget);
    expect(byAnchor('tasks.settings'), findsOneWidget);
    expect(find.text('My day'), findsOneWidget);
    expect(byAnchor('tasks.count'), findsOneWidget);
    expect(find.text('2 tasks'), findsOneWidget);
    expect(byAnchor('tasks.list'), findsOneWidget);
    expect(byAnchor('tasks.item'), findsNWidgets(2));
    expect(byAnchor('tasks.form'), findsOneWidget);
    expect(byAnchor('tasks.input'), findsOneWidget);
    expect(byAnchor('tasks.add'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Write tests');
    await tester.tap(find.text('Add'));
    await tester.pump();
    expect(find.text('Write tests'), findsOneWidget);
    expect(find.text('3 tasks'), findsOneWidget);
    expect(find.text('Enter a task first.'), findsNothing);
  });

  testWidgets('adding an empty task shows the error', (tester) async {
    await tester.pumpWidget(const TasksApp(initial: 'tasks'));
    await tester.tap(find.text('Add'));
    await tester.pump();
    expect(find.text('Enter a task first.'), findsOneWidget);
    expect(byAnchor('tasks.error'), findsOneWidget);
  });

  testWidgets('settings can be saved and closed', (tester) async {
    await tester.pumpWidget(const TasksApp(initial: 'settings'));
    final notify = find.descendant(
      of: byAnchor('settings.notify-toggle'),
      matching: find.byType(Switch),
    );
    final weekly = find.descendant(
      of: byAnchor('settings.weekly-toggle'),
      matching: find.byType(Switch),
    );
    expect(byAnchor('settings.saved'), findsNothing);
    expect(tester.widget<Switch>(weekly).value, isTrue);
    await tester.tap(notify);
    await tester.pump();
    await tester.tap(find.text('Save'));
    await tester.pump();
    expect(find.text('Saved.'), findsOneWidget);
    expect(byAnchor('settings.saved'), findsOneWidget);
    expect(tester.widget<Switch>(notify).value, isTrue);
    expect(tester.widget<Switch>(weekly).value, isTrue);
    await tester.tap(find.text('Back'));
    await tester.pump();
    expect(find.text('My day'), findsOneWidget);
  });

  testWidgets('settings exposes every prototype anchor', (tester) async {
    await tester.pumpWidget(const TasksApp(initial: 'settings'));
    for (final id in [
      'settings',
      'settings.header',
      'settings.title',
      'settings.back',
      'settings.notify',
      'settings.notify-toggle',
      'settings.weekly',
      'settings.weekly-toggle',
      'settings.save',
    ]) {
      expect(byAnchor(id), findsOneWidget);
    }
    expect(byAnchor('settings.saved'), findsNothing);
    await tester.tap(find.text('Save'));
    await tester.pump();
    expect(byAnchor('settings.saved'), findsOneWidget);
  });

  testWidgets('weekly summary is on by default and can be toggled', (
    tester,
  ) async {
    await tester.pumpWidget(const TasksApp(initial: 'settings'));
    expect(find.text('Weekly summary'), findsOneWidget);
    final toggle = find.descendant(
      of: byAnchor('settings.weekly-toggle'),
      matching: find.byType(Switch),
    );
    expect(tester.widget<Switch>(toggle).value, isTrue);
    final notifyY = tester.getTopLeft(byAnchor('settings.notify')).dy;
    final weeklyY = tester.getTopLeft(byAnchor('settings.weekly')).dy;
    final saveY = tester.getTopLeft(byAnchor('settings.save')).dy;
    expect(notifyY, lessThan(weeklyY));
    expect(weeklyY, lessThan(saveY));
    await tester.tap(toggle);
    await tester.pump();
    expect(tester.widget<Switch>(toggle).value, isFalse);
    await tester.tap(find.text('Save'));
    await tester.pump();
    expect(find.text('Saved.'), findsOneWidget);
  });

  testWidgets('tapping a setting name toggles it', (tester) async {
    await tester.pumpWidget(const TasksApp(initial: 'settings'));
    for (final entry in {
      'Daily reminder': 'settings.notify-toggle',
      'Weekly summary': 'settings.weekly-toggle',
    }.entries) {
      final toggle = find.descendant(
        of: byAnchor(entry.value),
        matching: find.byType(Switch),
      );
      final start = tester.widget<Switch>(toggle).value;
      await tester.tap(find.text(entry.key));
      await tester.pump();
      expect(tester.widget<Switch>(toggle).value, !start, reason: entry.key);
      await tester.tap(find.text(entry.key));
      await tester.pump();
      expect(tester.widget<Switch>(toggle).value, start, reason: entry.key);
    }
  });

  testWidgets('tapping the switch toggles it once', (tester) async {
    await tester.pumpWidget(const TasksApp(initial: 'settings'));
    final toggle = find.descendant(
      of: byAnchor('settings.notify-toggle'),
      matching: find.byType(Switch),
    );
    expect(tester.widget<Switch>(toggle).value, isFalse);
    await tester.tap(toggle);
    await tester.pump();
    expect(tester.widget<Switch>(toggle).value, isTrue);
  });

  testWidgets('about opens directly, exposes its anchors, and shows details', (
    tester,
  ) async {
    await tester.pumpWidget(
      const TasksApp(key: ValueKey('about-containers'), initial: 'about'),
    );
    for (final id in [
      'about',
      'about.header',
      'about.title',
      'about.back',
      'about.summary',
      'about.version',
      'about.more',
    ]) {
      expect(byAnchor(id), findsOneWidget);
    }
    expect(find.text('About'), findsOneWidget);
    expect(find.text('Tasks keeps today\'s work in one list.'), findsOneWidget);
    expect(find.text('Version 1.0'), findsOneWidget);
    expect(find.text('Show details'), findsOneWidget);
    expect(byAnchor('about.details'), findsNothing);

    await tester.tap(find.text('Show details'));
    await tester.pump();
    expect(byAnchor('about.details'), findsOneWidget);
    expect(find.text('Built from a ProtoFlow prototype.'), findsOneWidget);
    expect(find.text('Hide details'), findsOneWidget);

    await tester.tap(find.text('Hide details'));
    await tester.pump();
    expect(byAnchor('about.details'), findsNothing);
    expect(find.text('Show details'), findsOneWidget);

    await tester.tap(find.text('Back'));
    await tester.pump();
    expect(byAnchor('tasks'), findsOneWidget);
  });

  testWidgets('screen and region anchors are explicit semantics containers', (
    tester,
  ) async {
    await tester.pumpWidget(const TasksApp(initial: 'tasks'));
    for (final id in ['tasks', 'tasks.header', 'tasks.list', 'tasks.form']) {
      final semantics = semanticsFor(tester, id);
      expect(semantics.container, isTrue, reason: id);
      expect(semantics.explicitChildNodes, isTrue, reason: id);
    }

    await tester.tap(find.text('Settings'));
    await tester.pump();
    for (final id in [
      'settings',
      'settings.header',
      'settings.notify',
      'settings.weekly',
    ]) {
      final semantics = semanticsFor(tester, id);
      expect(semantics.container, isTrue, reason: id);
      expect(semantics.explicitChildNodes, isTrue, reason: id);
    }

    await tester.pumpWidget(
      const TasksApp(key: ValueKey('about-containers'), initial: 'about'),
    );
    for (final id in ['about', 'about.header']) {
      final semantics = semanticsFor(tester, id);
      expect(semantics.container, isTrue, reason: id);
      expect(semantics.explicitChildNodes, isTrue, reason: id);
    }
  });
}
