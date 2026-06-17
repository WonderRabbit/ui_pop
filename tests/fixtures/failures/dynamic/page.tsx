const queryKey = "keyword";
const columns = [{ label: "Dynamic total" }];

function useOrdersFetcher() {
  return [];
}

function fetchOrdersViaUnknownWrapper() {
  return [];
}

export default function DynamicOnlyPage() {
  const orders = useOrdersFetcher();
  const wrappedOrders = fetchOrdersViaUnknownWrapper();

  return (
    <main>
      <h1>Dynamic Only</h1>
      <form>
        <label htmlFor="keyword">Keyword</label>
        <input id="other" name="keyword" />
        <label htmlFor={queryKey}>Dynamic Keyword</label>
        <input id={queryKey} name={queryKey} />
      </form>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...orders, ...wrappedOrders].map((order) => (
            <tr key={String(order)} />
          ))}
        </tbody>
      </table>
    </main>
  );
}
