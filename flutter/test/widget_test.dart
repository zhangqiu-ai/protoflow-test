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
    expect(byAnchor('tasks'), findsOneWidget);
    expect(byAnchor('tasks.header'), findsOneWidget);
    expect(byAnchor('tasks.title'), findsOneWidget);
    expect(byAnchor('tasks.settings'), findsOneWidget);
    expect(find.text('My day'), findsOneWidget);
    expect(byAnchor('tasks.list'), findsOneWidget);
    expect(byAnchor('tasks.item'), findsNWidgets(2));
    expect(byAnchor('tasks.form'), findsOneWidget);
    expect(byAnchor('tasks.input'), findsOneWidget);
    expect(byAnchor('tasks.add'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Write tests');
    await tester.tap(find.text('Add'));
    await tester.pump();
    expect(find.text('Write tests'), findsOneWidget);
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
    await tester.tap(find.byType(Switch));
    await tester.tap(find.text('Save'));
    await tester.pump();
    expect(find.text('Saved.'), findsOneWidget);
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
      'settings.save',
    ]) {
      expect(byAnchor(id), findsOneWidget);
    }
    expect(byAnchor('settings.saved'), findsNothing);
    await tester.tap(find.text('Save'));
    await tester.pump();
    expect(byAnchor('settings.saved'), findsOneWidget);
  });

  testWidgets('screen and region anchors are explicit semantics containers',
      (tester) async {
    await tester.pumpWidget(const TasksApp(initial: 'tasks'));
    for (final id in [
      'tasks',
      'tasks.header',
      'tasks.list',
      'tasks.form',
    ]) {
      final semantics = semanticsFor(tester, id);
      expect(semantics.container, isTrue, reason: id);
      expect(semantics.explicitChildNodes, isTrue, reason: id);
    }

    await tester.tap(find.text('Settings'));
    await tester.pump();
    for (final id in ['settings', 'settings.header', 'settings.notify']) {
      final semantics = semanticsFor(tester, id);
      expect(semantics.container, isTrue, reason: id);
      expect(semantics.explicitChildNodes, isTrue, reason: id);
    }
  });
}
