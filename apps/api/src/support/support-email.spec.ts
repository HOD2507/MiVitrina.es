import { Locale } from "@mivitrina/shared";
import { buildSupportReplyEmail, escapeHtml } from "./support-email";

describe("buildSupportReplyEmail", () => {
  const base = { ticketNumber: 42, ticketSubject: "No me carga el pago", reply: "Hola, ya lo hemos revisado.", url: "https://mivitrina.es/es/soporte/abc" };

  it("en el idioma del usuario (ES/EN) con número de ticket y enlace", () => {
    const es = buildSupportReplyEmail({ ...base, locale: Locale.ES });
    const en = buildSupportReplyEmail({ ...base, locale: Locale.EN });

    expect(es.subject).toContain("Respuesta a tu solicitud de soporte #42");
    expect(en.subject).toContain("Reply to your support request #42");
    expect(es.html).toContain('href="https://mivitrina.es/es/soporte/abc"');
    expect(en.html).toContain("View the conversation and reply");
  });

  it("escapa el HTML del asunto y de la respuesta (texto libre: no se puede inyectar marcado en el email)", () => {
    const { html } = buildSupportReplyEmail({
      ...base,
      locale: Locale.ES,
      ticketSubject: `<script>alert(1)</script>`,
      reply: `<img src=x onerror="steal()"> & "comillas"`,
    });

    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=&quot;steal()&quot;&gt; &amp; &quot;comillas&quot;");
  });

  it("recorta las respuestas largas", () => {
    const { html } = buildSupportReplyEmail({ ...base, locale: Locale.ES, reply: "a".repeat(5000) });
    expect(html.length).toBeLessThan(1500);
    expect(html).toContain("…");
  });

  it("escapeHtml cubre & < > \" '", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
