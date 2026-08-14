/**
 * Substitui marcadores `{chave}` por valores. Usado em mensagens que precisam
 * de dados em tempo de execução (email do utilizador, número do passo, etc.).
 */
export function t(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
