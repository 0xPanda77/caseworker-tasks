// Runtime configuration for the web app.
// API_URL points at the tasks API (see ../api). Defaults to the local dev port.
export const config = {
  apiUrl: process.env.API_URL || 'http://localhost:4000',
};
