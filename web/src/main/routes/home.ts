import { Application } from 'express';

export default function (app: Application): void {
  // The task list is the start page.
  app.get('/', (req, res) => {
    res.redirect('/tasks');
  });
}
