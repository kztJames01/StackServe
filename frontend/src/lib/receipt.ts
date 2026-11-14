import {
  CATALOG_VERSION,
  CHECKED_AT,
  HEADLINE_CLIFF,
  RECEIPT_SCENARIO,
  RECEIPT_STACK,
  RECEIPT_WORKLOAD,
  padDecimal,
} from "./data";

export type ReceiptRow = {
  name: string;
  qty: string;
  amount: string;
};

export const RECEIPT = {
  brand: "STACKSERVE",
  workload: RECEIPT_WORKLOAD,
  catalog: `catalog ${CATALOG_VERSION}`,
  role: RECEIPT_STACK.role.toLowerCase(),
  rows: RECEIPT_SCENARIO.lines.map((l): ReceiptRow => ({
    name: l.short,
    qty: `${l.units} ${l.unit}`,
    amount: padDecimal(l.amount),
  })),
  totalLabel: "KNOWN TOTAL",
  total: `$${padDecimal(RECEIPT_SCENARIO.total)} / mo`,
  cliff: `${HEADLINE_CLIFF.scenario} → ${HEADLINE_CLIFF.card} rejected (${HEADLINE_CLIFF.used} > ${HEADLINE_CLIFF.limit} ${HEADLINE_CLIFF.unit})`,
  cliffLines: [
    `${HEADLINE_CLIFF.scenario} → ${HEADLINE_CLIFF.card} rejected`,
    `(${HEADLINE_CLIFF.used} > ${HEADLINE_CLIFF.limit} ${HEADLINE_CLIFF.unit})`,
  ],
  stamp: "PREPARED — NOT DEPLOYED",
  footer: `verify before purchase · checked ${CHECKED_AT}`,
} as const;
