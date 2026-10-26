import { createTask, deleteTask, getTask, listTasks, updateTaskStatus } from '../services/taskApi';
import { errorView, fromApiErrors, isTaskStatus, readTaskForm, validateTaskForm } from '../utils/taskForm';
import { isOverdue } from '../utils/taskStatus';

import { Application, Response } from 'express';

const renderNotFound = (res: Response): void => {
  res.status(404).render('not-found');
};

// Success banners use a query flag set by the redirect after a POST (e.g. /tasks/123?created=1).
// No session store is needed; the flag only picks a fixed message, so it can't inject content.
export default function (app: Application): void {
  app.get('/tasks', async (req, res) => {
    const tasks = await listTasks();
    res.render('tasks/list', {
      tasks: tasks.map(task => ({ ...task, overdue: isOverdue(task) })),
      deleted: req.query.deleted === '1',
    });
  });

  app.get('/tasks/new', (req, res) => {
    res.render('tasks/new', { form: { status: 'TODO' } });
  });

  app.post('/tasks', async (req, res) => {
    const form = readTaskForm(req.body);
    const validation = validateTaskForm(form);
    if (!validation.ok) {
      return res.status(400).render('tasks/new', { form, ...errorView(validation.errors, validation.dateErrorParts) });
    }

    const result = await createTask(validation.input);
    if (result.kind === 'invalid') {
      // Our own checks should catch everything, but the API is the source of truth.
      return res.status(400).render('tasks/new', { form, ...errorView(fromApiErrors(result.errors)) });
    }
    if (result.kind === 'notFound') {
      throw new Error('Tasks API returned 404 for POST /tasks');
    }

    // POST-redirect-GET: refreshing the next page won't resubmit the form.
    res.redirect(303, `/tasks/${result.value.id}?created=1`);
  });

  app.get('/tasks/:id', async (req, res) => {
    const result = await getTask(req.params.id);
    if (result.kind !== 'ok') {
      return renderNotFound(res);
    }
    res.render('tasks/show', {
      task: { ...result.value, overdue: isOverdue(result.value) },
      created: req.query.created === '1',
      updated: req.query.updated === '1',
    });
  });

  app.get('/tasks/:id/status', async (req, res) => {
    const result = await getTask(req.params.id);
    if (result.kind !== 'ok') {
      return renderNotFound(res);
    }
    res.render('tasks/status', { task: result.value, status: result.value.status });
  });

  app.post('/tasks/:id/status', async (req, res) => {
    const id = req.params.id;
    const status = req.body?.status;

    if (!isTaskStatus(status)) {
      // Re-render needs the task for the page heading.
      const task = await getTask(id);
      if (task.kind !== 'ok') {
        return renderNotFound(res);
      }
      return res
        .status(400)
        .render('tasks/status', { task: task.value, ...errorView([{ field: 'status', message: 'Select a status' }]) });
    }

    const result = await updateTaskStatus(id, status);
    if (result.kind === 'notFound') {
      return renderNotFound(res);
    }
    if (result.kind === 'invalid') {
      // The status was checked above, so a 400 here is a bug, not user error.
      throw new Error(`Tasks API rejected status update: ${JSON.stringify(result.errors)}`);
    }

    res.redirect(303, `/tasks/${id}?updated=1`);
  });

  app.get('/tasks/:id/delete', async (req, res) => {
    const result = await getTask(req.params.id);
    if (result.kind !== 'ok') {
      return renderNotFound(res);
    }
    res.render('tasks/delete', { task: result.value });
  });

  app.post('/tasks/:id/delete', async (req, res) => {
    const result = await deleteTask(req.params.id);
    if (result.kind === 'notFound') {
      return renderNotFound(res);
    }
    if (result.kind === 'invalid') {
      throw new Error(`Tasks API rejected delete: ${JSON.stringify(result.errors)}`);
    }

    res.redirect(303, '/tasks?deleted=1');
  });
}
