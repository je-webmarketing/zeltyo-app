import BookingsManager from "../src/components/BookingsManager";

export default function Dashboard() {
  const selectedBusiness = {
    id: "BUS-2",
    name: "Barber Club",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "#F7F4EA",
        padding: 24,
      }}
    >
      <h1 style={{ color: "#F2D06B", textAlign: "center" }}>
        Zeltyo • Commerçant
      </h1>

      <BookingsManager selectedBusiness={selectedBusiness} />
    </div>
  );
}