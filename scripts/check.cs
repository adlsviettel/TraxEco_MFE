using System;
using System.IO;

class Program {
    static void Main() {
        string path = @"D:\Project_A1A\Fabric Warehouse\Xamarin\VietNameProject\QCFW - v1.0.1\AccW\Main.cs";
        string text = File.ReadAllText(path);
        int idx = text.IndexOf("edWB.TextChanged");
        if (idx > 0) {
            Console.WriteLine(text.Substring(idx, 200));
        }
    }
}
