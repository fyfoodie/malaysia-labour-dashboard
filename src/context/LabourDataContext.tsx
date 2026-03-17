import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { fetchAllLabourData, LabourData } from "@/data/labourData";

interface LabourDataContextType {
  data: LabourData | null;
  loading: boolean;
  error: string | null;
}

const LabourDataContext = createContext<LabourDataContextType>({
  data: null,
  loading: true,
  error: null,
});

export const LabourDataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<LabourData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🔄 LabourDataContext: starting fetch...");
    fetchAllLabourData()
      .then((result) => {
        console.log("✅ LabourDataContext: fetch complete", result);
        if (result) {
          Object.entries(result).forEach(([key, val]) => {
            console.log(`  📊 ${key}: ${(val as any[]).length} rows`);
          });
          setData(result);
        } else {
          setError("Failed to load data from DOSM.");
        }
      })
      .catch((err) => {
        console.error("❌ LabourDataContext: fetch threw error", err);
        setError("Network error. Please try again.");
      })
      .finally(() => {
        console.log("🏁 LabourDataContext: loading complete");
        setLoading(false);
      });
  }, []);

  return (
    <LabourDataContext.Provider value={{ data, loading, error }}>
      {error && (
        <div className="fixed top-0 left-0 right-0 z-[999] bg-red-500 text-white text-xs text-center py-2 px-4">
          ⚠️ Data Error: {error}
        </div>
      )}
      {children}
    </LabourDataContext.Provider>
  );
};

export const useLabourData = () => useContext(LabourDataContext);
