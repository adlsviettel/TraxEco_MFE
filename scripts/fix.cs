using System;
using System.IO;

class Program {
    static void Main() {
        string path = @"D:\Project_A1A\Fabric Warehouse\Xamarin\VietNameProject\QCFW - v1.0.1\AccW\Main.cs";
        string text = File.ReadAllText(path);

        if (!text.Contains("bool isClearing")) {
            text = text.Replace("byte[] ImageByteArray = new byte[] { };", "byte[] ImageByteArray = new byte[] { };\r\n        bool isClearing = false;");
            text = text.Replace("private void ClearData()\r\n        {", "private void ClearData()\r\n        {\r\n            isClearing = true;");
            text = text.Replace("LinkImg = \"\";\r\n            path = \"\";\r\n        }", "LinkImg = \"\";\r\n            path = \"\";\r\n            isClearing = false;\r\n        }");

            string[] fields = { "WB", "WM", "WE", "Yard", "Moisture", "Distance2Stripes", "LengthCycleStandard", "LengthCycleActual", "CycleNumber", "CycleHori", "CycleVer", "GSM", "Pallet", "Note" };
            foreach (var f in fields) {
                string search = "ed" + f + ".TextChanged += delegate\r\n            {\r\n                try";
                string repl = "ed" + f + ".TextChanged += delegate\r\n            {\r\n                if (isClearing) return;\r\n                try";
                text = text.Replace(search, repl);
            }
            File.WriteAllText(path, text);
            Console.WriteLine("Fixed successfully in C#.");
        } else {
            Console.WriteLine("Already fixed.");
        }
    }
}
