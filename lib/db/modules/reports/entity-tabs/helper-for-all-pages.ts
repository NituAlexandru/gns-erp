// Funcție care face loop automat peste toate paginile
export async function fetchAllPages(fetchCallback: (page: number) => Promise<any>) {
  const allData: any[] = []
  let currentPage = 1
  let totalPages = 1

  do {
    const res = await fetchCallback(currentPage)
    if (res?.data) {
      allData.push(...res.data)
    }
    totalPages = res?.totalPages || 1
    currentPage++
  } while (currentPage <= totalPages)

  return allData
}
