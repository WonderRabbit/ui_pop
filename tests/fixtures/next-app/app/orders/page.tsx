const statusOptions = ["All", "Open", "Closed"];

export default function OrdersPage() {
  return (
    <main>
      <h1>Orders</h1>
      <form>
        <label htmlFor="keyword">Keyword</label>
        <input id="keyword" name="keyword" />
        <label htmlFor="status">Status</label>
        <select id="status" name="status">
          {statusOptions.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button type="submit">Search</button>
        <button type="reset">Reset</button>
      </form>
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
      </table>
    </main>
  );
}
