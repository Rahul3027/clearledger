/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const, @typescript-eslint/no-empty-object-type, react/no-unescaped-entities, jsx-a11y/role-has-required-aria-props, react/jsx-no-undef, no-restricted-imports */
"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronsUpDown, Settings2 } from "lucide-react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  // If server-side is true, parent components control pagination/sorting
  isServerSide?: boolean
  pageCount?: number
  onPaginationChange?: any
  onSortingChange?: any
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  isServerSide = false,
  pageCount = -1,
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  // Initialize state from URL params if server side
  React.useEffect(() => {
    if (isServerSide && searchParams) {
      const page = searchParams.get("page")
      const sort = searchParams.get("sort")
      const dir = searchParams.get("dir")
      const search = searchParams.get("search")

      if (sort && dir) {
        setSorting([{ id: sort, desc: dir === "desc" }])
      }
      if (search && searchKey) {
        setColumnFilters([{ id: searchKey, value: search }])
      }
    }
  }, [isServerSide, searchParams, searchKey])

  const createQueryString = React.useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams?.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

  const table = useReactTable({
    data,
    columns,
    onSortingChange: (updater) => {
      setSorting(updater)
      if (isServerSide) {
        const newSort = typeof updater === 'function' ? updater(sorting) : updater
        if (newSort.length > 0) {
          const params = new URLSearchParams(searchParams?.toString())
          params.set("sort", newSort[0].id)
          params.set("dir", newSort[0].desc ? "desc" : "asc")
          router.push(pathname + "?" + params.toString(), { scroll: false })
        } else {
          const params = new URLSearchParams(searchParams?.toString())
          params.delete("sort")
          params.delete("dir")
          router.push(pathname + "?" + params.toString(), { scroll: false })
        }
      }
    },
    onColumnFiltersChange: (updater) => {
      setColumnFilters(updater)
      if (isServerSide && searchKey) {
        const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater
        const searchFilter = newFilters.find(f => f.id === searchKey)
        const params = new URLSearchParams(searchParams?.toString())
        if (searchFilter && searchFilter.value) {
          params.set("search", searchFilter.value as string)
        } else {
          params.delete("search")
        }
        params.delete("page") // Reset page on search
        router.push(pathname + "?" + params.toString(), { scroll: false })
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: isServerSide,
    pageCount: isServerSide ? pageCount : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: isServerSide && searchParams ? {
        pageIndex: Number(searchParams.get("page") ?? "1") - 1,
        pageSize: Number(searchParams.get("pageSize") ?? "10"),
      } : undefined,
    },
  })

  return (
    <div className="w-full space-y-4">
      {/* Table Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          {searchKey && (
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="h-8 w-[150px] lg:w-[250px]"
            />
          )}
        </div>
        <div className="flex items-center space-x-2">
          {/* Column visibility or extra actions could go here */}
          <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
            <Settings2 className="mr-2 h-4 w-4" />
            View
          </Button>
        </div>
      </div>

      {/* Table Main Area */}
      <div className="rounded-md border border-gray-200 bg-white">
        <div className="w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b bg-gray-50/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-gray-200 transition-colors hover:bg-gray-100/50 data-[state=selected]:bg-gray-100">
                  {headerGroup.headers.map((header) => {
                    const isSorted = header.column.getIsSorted()
                    const ariaSort = isSorted === "asc" ? "ascending" : isSorted === "desc" ? "descending" : "none"
                    return (
                      <th
                        key={header.id}
                        className="h-10 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0"
                        aria-sort={header.column.getCanSort() ? ariaSort : undefined}
                      >
                        {header.isPlaceholder ? null : (
                          <div 
                            className={header.column.getCanSort() ? "flex items-center cursor-pointer select-none space-x-1" : ""}
                            onClick={header.column.getToggleSortingHandler()}
                            role={header.column.getCanSort() ? "button" : undefined}
                            tabIndex={header.column.getCanSort() ? 0 : undefined}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                header.column.toggleSorting()
                              }
                            }}
                          >
                            <span>
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </span>
                            {header.column.getCanSort() && (
                              <span className="text-gray-400 hover:text-gray-600 transition-colors">
                                {{
                                  asc: <ChevronUp className="h-4 w-4" aria-hidden="true" />,
                                  desc: <ChevronDown className="h-4 w-4" aria-hidden="true" />,
                                }[header.column.getIsSorted() as string] ?? <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />}
                              </span>
                            )}
                          </div>
                        )}
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="border-b border-gray-200 transition-colors hover:bg-gray-100/50 data-[state=selected]:bg-gray-50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-gray-900"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-24 text-center align-middle text-gray-500"
                  >
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-gray-500">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-gray-900">Rows per page</p>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value))
              }}
              className="h-8 w-[70px] rounded-md border border-input bg-transparent px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium text-gray-900">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => {
                if (isServerSide) {
                  router.push(pathname + "?" + createQueryString("page", "1"), { scroll: false })
                } else {
                  table.setPageIndex(0)
                }
              }}
              disabled={isServerSide ? (Number(searchParams?.get("page") || "1") <= 1) : !table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => {
                if (isServerSide) {
                  const current = Number(searchParams?.get("page") || "1")
                  router.push(pathname + "?" + createQueryString("page", String(current - 1)), { scroll: false })
                } else {
                  table.previousPage()
                }
              }}
              disabled={isServerSide ? (Number(searchParams?.get("page") || "1") <= 1) : !table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => {
                if (isServerSide) {
                  const current = Number(searchParams?.get("page") || "1")
                  router.push(pathname + "?" + createQueryString("page", String(current + 1)), { scroll: false })
                } else {
                  table.nextPage()
                }
              }}
              disabled={isServerSide ? (Number(searchParams?.get("page") || "1") >= pageCount) : !table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => {
                if (isServerSide) {
                  router.push(pathname + "?" + createQueryString("page", String(pageCount)), { scroll: false })
                } else {
                  table.setPageIndex(table.getPageCount() - 1)
                }
              }}
              disabled={isServerSide ? (Number(searchParams?.get("page") || "1") >= pageCount) : !table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
