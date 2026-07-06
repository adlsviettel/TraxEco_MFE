// Pure JS implementation for Zebra Browser Print without needing external SDK
export const zebraService = {
  printZPL: async (zpl: string) => {
    // 1. Set a timeout for the whole process
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      // 2. Get default printer from local Zebra Browser Print service
      const defaultRes = await fetch("http://127.0.0.1:9101/default?type=printer", {
        signal: controller.signal
      });
      
      if (!defaultRes.ok) {
        throw new Error("Không thể kết nối Zebra Browser Print (Port 9101).");
      }
      
      const defaultDevice = await defaultRes.json();
      
      if (!defaultDevice || !defaultDevice.uid) {
        throw new Error("Không tìm thấy máy in Zebra mặc định.");
      }

      // 3. Send ZPL to the printer
      const printRes = await fetch("http://127.0.0.1:9101/write", {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({
          device: defaultDevice,
          data: zpl
        }),
        signal: controller.signal
      });

      if (!printRes.ok) {
        throw new Error("Gửi lệnh ZPL thất bại.");
      }

      clearTimeout(timeout);
      return "Printed successfully";
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        throw new Error('Máy in Zebra không phản hồi (Timeout). Vui lòng kiểm tra cáp kết nối.');
      }
      throw new Error(error.message || 'Chưa bật Zebra Browser Print trên máy tính này.');
    }
  },
  
  generateZPL: (item: string, po: string, qty: number, barcode: string) => {
    return `
^XA
^PW800
^LL400
^FO50,50^A0N,40,40^FDItem: ${item}^FS
^FO50,100^A0N,40,40^FDPO: ${po}^FS
^FO50,150^A0N,40,40^FDQty: ${qty}^FS
^FO50,220^BY3,3,100^BCN,100,Y,N,N
^FD${barcode}^FS
^XZ
    `.trim();
  }
};
