import React, { useMemo } from "react";
import { LineItem } from "../types";
import { useTranslation } from "react-i18next";
import { convertToCurrency, getLineItemTotal } from "../helpers";
import styles from './bill-line-items.scss'
import { DataTable, Layer, Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow, TableToolbarSearch, Tile } from "@carbon/react";
import { isDesktop, useLayoutType } from "@openmrs/esm-framework";
import classNames from "classnames";

interface BillLineItemsProps {
    lineItems: Array<LineItem> | undefined
}

const BillLineItems: React.FC<BillLineItemsProps> = ({ lineItems }) => {
    const { t } = useTranslation();
    const layout = useLayoutType();
    const responsiveSize = isDesktop(layout) ? 'sm' : 'lg';

    const defaultCurrency = 'KES';

    const tableHeaders = [
        { header: t('number', 'Number'), key: 'no', width: 7 }, // Width as a percentage
        { header: t('billItem', 'Bill item'), key: 'billItem', width: 25 },
        { header: t('status', 'Status'), key: 'status', width: 25 },
        { header: t('quantity', 'Quantity'), key: 'quantity', width: 15 },
        { header: t('price', 'Price'), key: 'price', width: 24 },
        { header: t('total', 'Total'), key: 'total', width: 15 },
    ];

    const tableRows = useMemo(
        () =>
            lineItems?.map((item, index) => ({
                no: `${index + 1}`,
                id: `${item.uuid}`,
                billItem: item.billableService ? item.billableService : item?.item,
                status: item.status,
                quantity: item.quantity,
                price: convertToCurrency(item.price, defaultCurrency),
                total: convertToCurrency(getLineItemTotal(item), defaultCurrency),
            })) ?? [],
        [lineItems, defaultCurrency],
    );

    return (
        <div className={styles.lineItemsWrapper}>
            <DataTable
                headers={tableHeaders}
                rows={tableRows}
                size={responsiveSize}
                useZebraStyles
                overflowMenuOnHover={isDesktop(layout)}>
                {({ rows, headers, getRowProps, getTableProps }) => (
                    <TableContainer
                        description={
                            <span className={styles.tableDescription}>
                                <span>{t('itemsToBeBilled', 'Items to be billed')}</span>
                            </span>
                        }
                        title={t('lineItems', 'Line items')}>
                        <Table
                            {...getTableProps()}
                            aria-label={t('invoiceLineItems', 'Invoice line items')}
                            className={classNames(styles.invoiceTable, 'billingTable')}>
                            <TableHead>
                                <TableRow>
                                    {headers.map((header) => (
                                        <TableHeader key={header.key}>{header.header}</TableHeader>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rows.map((row) => {
                                    return (
                                        <TableRow {...getRowProps({ row })}>
                                            {row.cells.map((cell) => (
                                                <TableCell key={cell.id}>{cell.value}</TableCell>
                                            ))}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DataTable>
            {lineItems?.length === 0 && (
                <div className={styles.filterEmptyState}>
                    <Layer>
                        <Tile className={styles.filterEmptyStateTile}>
                            <p className={styles.filterEmptyStateContent}>
                                {t('noMatchingItemsToDisplay', 'No matching items to display')}
                            </p>
                        </Tile>
                    </Layer>
                </div>
            )}
        </div>
    )
}

export default BillLineItems;