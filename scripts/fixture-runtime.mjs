#!/usr/bin/env node
import { createServer } from "node:http";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(
    [
      "ui-pop fixture runtime",
      "",
      "Serve deterministic legacy-screen fixtures for runtime validation.",
      "",
      "Usage:",
      "  npm run fixture:runtime -- --port <port>",
      "",
      "Options:",
      "  --port <port>           Port to bind on 127.0.0.1.",
      "  -h, --help              Show this help message.",
      "",
    ].join("\n"),
  );
  process.exit(0);
}

const port = readPort(args);
const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`)
    .pathname;

  if (pathname === "/orders") {
    sendHtml(response, renderOrdersPage());
  } else if (pathname === "/missing-label") {
    sendHtml(response, renderMissingLabelPage());
  } else if (pathname === "/mismatch") {
    sendHtml(response, renderMismatchPage());
  } else {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found\n");
  }
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`fixture-runtime listening on http://127.0.0.1:${port.toString()}\n`);
});

function readPort(tokens) {
  const optionIndex = tokens.indexOf("--port");
  if (optionIndex === -1) {
    fail("ERR_MISSING_REQUIRED_OPTION", "--port <port> is required.");
  }

  const value = tokens[optionIndex + 1];
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535) {
    fail("ERR_INVALID_OPTION", "--port must be an integer between 1 and 65535.");
  }
  return parsed;
}

function fail(code, message) {
  process.stderr.write(`${code}\n${message}\n`);
  process.exit(1);
}

function sendHtml(response, html) {
  response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  response.end(html);
}

function renderOrdersPage() {
  return page(
    "Orders",
    [
      '<label for="keyword">Keyword</label><input id="keyword" name="keyword">',
      '<label for="status">Status</label><select id="status"><option>All</option></select>',
    ],
    ["Search", "Reset"],
    ["Order ID", "Status", "Total"],
  );
}

function renderMissingLabelPage() {
  return page(
    "Orders",
    [
      '<label for="keyword">Term</label><input id="keyword" name="keyword">',
      '<label for="status">Status</label><select id="status"><option>All</option></select>',
    ],
    ["Search", "Reset"],
    ["Order ID", "Status", "Total"],
  );
}

function renderMismatchPage() {
  return page(
    "Invoices",
    [
      '<label for="keyword">Customer</label><input id="keyword" name="keyword">',
      '<label for="status">State</label><select id="status"><option>All</option></select>',
    ],
    ["Apply", "Clear"],
    ["Invoice ID", "State", "Amount"],
  );
}

function page(title, fields, buttons, columns) {
  const buttonHtml = buttons.map((label) => `<button type="button">${label}</button>`).join("");
  const headerHtml = columns.map((label) => `<th scope="col">${label}</th>`).join("");

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    "</head>",
    "<body>",
    "<main>",
    `<h1>${title}</h1>`,
    `<form>${fields.join("")}${buttonHtml}</form>`,
    `<table><thead><tr>${headerHtml}</tr></thead><tbody></tbody></table>`,
    "</main>",
    "</body>",
    "</html>",
  ].join("");
}
