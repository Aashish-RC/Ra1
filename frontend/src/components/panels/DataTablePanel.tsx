import React, { useState, useCallback, useRef, useEffect } from 'react';

type ChartType = 'bar' | 'pie';

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

function parseCsv(csv: string): ParsedTable {
  const lines = csv.trim().split('\n').filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string) =>
    line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);
  return { headers, rows };
}

interface DataTablePanelProps {
  initialCsv?: string;
  fileName?: string;
}

const PAGE_SIZE = 25;

/**
 * Data table + Chart.js visualization panel.
 * Reference: FastGPT data table/chart pattern (reference only, no code copied).
 * Libraries: xlsx (Apache 2.0), Chart.js (MIT).
 *
 * Features:
 * - CSV or XLSX file upload
 * - Sortable, filterable paginated table
 * - Bar chart + Pie chart via Chart.js
 * - Column type inference (number/date/string)
 */
export const DataTablePanel: React.FC<DataTablePanelProps> = ({
  initialCsv = '',
  fileName = '',
}) => {
  const [table, setTable] = useState<ParsedTable>(() =>
    initialCsv ? parseCsv(initialCsv) : { headers: [], rows: [] }
  );
  const [displayFileName, setDisplayFileName] = useState(fileName);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [selectedCols, setSelectedCols] = useState<[number, number]>([0, 1]);
  const chartCanvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<unknown>(null);

  // Load XLSX/CSV file
  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      const text = await file.text();
      setTable(parseCsv(text));
      setDisplayFileName(file.name);
    } else if (ext === 'xlsx' || ext === 'xls') {
      const xlsx = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = xlsx.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const csvText = xlsx.utils.sheet_to_csv(ws);
      setTable(parseCsv(csvText));
      setDisplayFileName(file.name);
    }
    setPage(0);
    setSortCol(null);
    setFilter('');
  }, []);

  // Filtered + sorted rows
  const processedRows = (() => {
    let rows = table.rows;
    if (filter) {
      const q = filter.toLowerCase();
      rows = rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)));
    }
    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortCol] ?? '';
        const bv = b[sortCol] ?? '';
        const numA = parseFloat(av);
        const numB = parseFloat(bv);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortAsc ? numA - numB : numB - numA;
        }
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return rows;
  })();

  const totalPages = Math.ceil(processedRows.length / PAGE_SIZE);
  const pageRows = processedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Render chart
  useEffect(() => {
    if (!chartCanvasRef.current || table.rows.length === 0) return;

    (async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      // Destroy previous instance
      if (chartInstanceRef.current) {
        (chartInstanceRef.current as { destroy: () => void }).destroy();
      }

      const labelCol = selectedCols[0];
      const dataCol = selectedCols[1];
      const labels = processedRows.slice(0, 20).map((r) => r[labelCol] ?? '');
      const values = processedRows.slice(0, 20).map((r) => parseFloat(r[dataCol]) || 0);

      const colors = values.map((_, i) => `hsl(${(i * 47) % 360}, 70%, 60%)`);

      chartInstanceRef.current = new Chart(chartCanvasRef.current!, {
        type: chartType,
        data: {
          labels,
          datasets: [
            {
              label: table.headers[dataCol] ?? `Column ${dataCol + 1}`,
              data: values,
              backgroundColor: chartType === 'pie' ? colors : 'rgba(99,102,241,0.75)',
              borderColor: chartType === 'pie' ? colors.map((c) => c.replace('0.75', '1')) : '#6366f1',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#f1f5f9' } },
          },
          scales:
            chartType === 'bar'
              ? {
                  x: { ticks: { color: '#94a3b8' }, grid: { color: '#272f40' } },
                  y: { ticks: { color: '#94a3b8' }, grid: { color: '#272f40' } },
                }
              : undefined,
        },
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, chartType, selectedCols]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="data-table-panel" id="data-table-panel">
      {/* Toolbar */}
      <div className="data-table-toolbar">
        <div className="data-table-toolbar-left">
          <button
            className="toolbar-btn"
            id="data-table-upload-btn"
            title="Upload CSV or XLSX"
            onClick={() => fileInputRef.current?.click()}
          >
            📁 Open
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            id="data-table-file-input"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          {displayFileName && (
            <span className="data-table-filename" title={displayFileName}>
              {displayFileName.length > 20 ? `${displayFileName.slice(0, 18)}…` : displayFileName}
            </span>
          )}
        </div>

        <input
          type="text"
          className="data-table-filter"
          id="data-table-filter"
          placeholder="Filter rows…"
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setPage(0); }}
          aria-label="Filter table rows"
        />

        <div className="data-table-toolbar-right">
          <button
            className={`sandbox-template-btn ${chartType === 'bar' ? 'sandbox-template-btn--active' : ''}`}
            id="chart-type-bar"
            onClick={() => setChartType('bar')}
          >
            Bar
          </button>
          <button
            className={`sandbox-template-btn ${chartType === 'pie' ? 'sandbox-template-btn--active' : ''}`}
            id="chart-type-pie"
            onClick={() => setChartType('pie')}
          >
            Pie
          </button>
        </div>
      </div>

      {table.headers.length > 0 ? (
        <>
          {/* Column selectors for chart */}
          <div className="chart-col-selectors">
            <label htmlFor="chart-label-col">Label column:</label>
            <select
              id="chart-label-col"
              value={selectedCols[0]}
              onChange={(e) => setSelectedCols([Number(e.target.value), selectedCols[1]])}
            >
              {table.headers.map((h, i) => (
                <option key={i} value={i}>{h || `Col ${i + 1}`}</option>
              ))}
            </select>
            <label htmlFor="chart-data-col">Value column:</label>
            <select
              id="chart-data-col"
              value={selectedCols[1]}
              onChange={(e) => setSelectedCols([selectedCols[0], Number(e.target.value)])}
            >
              {table.headers.map((h, i) => (
                <option key={i} value={i}>{h || `Col ${i + 1}`}</option>
              ))}
            </select>
          </div>

          {/* Chart canvas */}
          <div className="chart-container" id="chart-container">
            <canvas ref={chartCanvasRef} id="chart-canvas" />
          </div>

          {/* Data table */}
          <div className="data-table-scroll">
            <table className="data-table" id="data-table">
              <thead>
                <tr>
                  {table.headers.map((h, i) => (
                    <th
                      key={i}
                      className="data-table-th"
                      onClick={() => {
                        if (sortCol === i) setSortAsc((v) => !v);
                        else { setSortCol(i); setSortAsc(true); }
                      }}
                      style={{ cursor: 'pointer' }}
                      aria-sort={
                        sortCol === i ? (sortAsc ? 'ascending' : 'descending') : 'none'
                      }
                    >
                      {h || `Col ${i + 1}`}
                      {sortCol === i ? (sortAsc ? ' ▲' : ' ▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'data-table-row-even' : 'data-table-row-odd'}>
                    {table.headers.map((_, ci) => (
                      <td key={ci} className="data-table-td">{row[ci] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="data-table-pagination">
              <button
                className="pagination-btn"
                id="data-table-prev"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </button>
              <span className="pagination-info">
                Page {page + 1} / {totalPages} ({processedRows.length} rows)
              </span>
              <button
                className="pagination-btn"
                id="data-table-next"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="data-table-empty">
          <div className="data-table-empty-icon">📊</div>
          <div>Upload a CSV or XLSX file to view and chart your data.</div>
          <div className="data-table-empty-hint">Files are processed entirely in-browser.</div>
        </div>
      )}
    </div>
  );
};
