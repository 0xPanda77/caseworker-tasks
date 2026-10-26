import * as path from 'path';

import { formatDateTime } from '../../utils/dates';
import { STATUS_LABELS, STATUS_TAG_CLASSES } from '../../utils/taskStatus';

import * as express from 'express';
import * as nunjucks from 'nunjucks';

export class Nunjucks {
  constructor(public developmentMode: boolean) {
    this.developmentMode = developmentMode;
  }

  enableFor(app: express.Express): void {
    app.set('view engine', 'njk');
    const env = nunjucks.configure(path.join(__dirname, '..', '..', 'views'), {
      autoescape: true,
      watch: this.developmentMode,
      express: app,
    });

    env.addFilter('formatDateTime', formatDateTime);
    env.addFilter('statusLabel', (status: string) => STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status);
    env.addFilter(
      'statusTagClass',
      (status: string) => STATUS_TAG_CLASSES[status as keyof typeof STATUS_TAG_CLASSES] ?? ''
    );

    app.use((req, res, next) => {
      res.locals.pagePath = req.path;
      next();
    });
  }
}
