using Android.App;
using Android.Content;
using Android.Graphics;
using Android.OS;
using Android.Runtime;
using Android.Views;
using Android.Widget;
using CSDL;
using Org.BouncyCastle.Bcpg.Sig;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net;
using System.Text;

namespace QCFW
{
    internal class CSDL
    {
        public static string UserName = "", Fac = "", Lang = "", Url = "", UrlUpdate = "http://192.168.1.241/UpdateManager/QCFW_Test.apk", UrlAPICall_ListDF = "", UrlAPICall_PF = "";
        public static Connect kn;
        public static List<string> lsServer = new List<string>() {
            //"Data Source=172.18.99.41;Initial Catalog=DtradeProduction;Persist Security Info=True;User ID=user_prog1;Password=tHBJ@eJd94mZ"
            //"Data Source=192.168.1.245;Database=DtradeProduction;User ID=user_prog1;Password=tHBJ@eJd94mZ;Connect Timeout=30;Encrypt=False;TrustServerCertificate=False;ApplicationIntent=ReadWrite;MultiSubnetFailover=False" };
            /*"Data Source=192.168.50.253;User ID=sa;Password=Sql4116!;Connect Timeout=30;Encrypt=False;TrustServerCertificate=False;ApplicationIntent=ReadWrite;MultiSubnetFailover=False",*/
            "Data Source=192.168.54.8;User ID=sa;Password=Admin@168*;Connect Timeout=30;Encrypt=False;TrustServerCertificate=False;ApplicationIntent=ReadWrite;MultiSubnetFailover=False"
            };
        public static A1ATeam.LayoutRequest rq;
        public static ISharedPreferences pre;
        public static List<MultiDimensionList> ltLang = new List<MultiDimensionList>();
        public static int LangRef = 0;
        public static DataTable dtImg, dtImgRP = new DataTable();
        public static bool IsNumeric(string value)
        {
            return value.All(char.IsNumber);
        }
        public static string Language(string c)
        {
            try { return CSDL.ltLang[CSDL.ltLang.FindIndex(x => x.FirstText == c)].Ref_Val1; }
            catch { return "error"; }
        }
        public static void CallWaiting(string chuoi)
        {
            if (chuoi == "")
                Acr.UserDialogs.UserDialogs.Instance.ShowLoading("...loading...");
            else Acr.UserDialogs.UserDialogs.Instance.ShowLoading(chuoi);
        }
        public static void HideWaiting()
        {
            Acr.UserDialogs.UserDialogs.Instance.HideLoading();
        }
    }
    public class MultiDimensionList
    {
        public string FirstText { set; get; }
        public string Ref_Val1 { get; set; }
        public string Ref_Val2 { get; set; }
    }
    public class Clss
    {
        public string str1 { get; set; }
        public string str2 { get; set; }
        public string str3 { get; set; }
        public string str4 { get; set; }
        public string str5 { get; set; }
        public string str6 { get; set; }
        public string str7 { get; set; }
        public string str8 { get; set; }
        public string str9 { get; set; }
        public string str10 { get; set; }
        public string str11 { get; set; }
        public string str12 { get; set; }
        public string str13 { get; set; }
        public string str14 { get; set; }
        public string str15 { get; set; }
        public bool cbselect { get; set; }
    }
    public class Holder : Java.Lang.Object
    {
        public TextView str1 { get; set; }
        public TextView str2 { get; set; }
        public TextView str3 { get; set; }
        public TextView str4 { get; set; }
        public TextView str5 { get; set; }
        public TextView str6 { get; set; }
        public TextView str7 { get; set; }
        public TextView str8 { get; set; }
        public TextView str9 { get; set; }
        public TextView str10 { get; set; }
        public TextView str11 { get; set; }
        public TextView str12 { get; set; }
        public TextView str13 { get; set; }
        public TextView str14 { get; set; }
        public TextView str15 { get; set; }
        public CheckBox cbselect { get; set; }
    }
    class Image_View_Properties
    {
        public Bitmap Img { get; set; }
        public string Job { get; set; }
        public string GarmentType { get; set; }
        public string RejectCode { get; set; }
    }
    class Image_View_Holder : Java.Lang.Object
    {
        public ImageView Img { get; set; }
        public TextView Infor { get; set; }
        public TextView Code { get; set; }
        public TextView Qty { get; set; }
    }
    class Image_View_GetData
    {
        static byte[] img = null;
        static WebClient web = new WebClient();
        static DataTable dt = new DataTable();
        static Connect kn;
        public static List<Image_View_Properties> GetData(Context context)
        {
            dt = CSDL.dtImg;
            List<Image_View_Properties> ls = new List<Image_View_Properties>();
            Inline(ls, context);

            web.DownloadDataCompleted += Web_DownloadDataCompleted;

            return ls;
        }

        private static void Web_DownloadDataCompleted(object sender, DownloadDataCompletedEventArgs e)
        {
            img = e.Result;
        }
        private static void Inline(List<Image_View_Properties> ls, Context context)
        {
            try
            {
                int d = 0;
                foreach (DataRow r in dt.Rows)
                {
                    string filename = "";
                    if (r["Img"].ToString().Contains(".jpg"))
                        filename = r["Img"].ToString();
                    else filename = r["Img"].ToString() + ".jpg";
                    string url = CSDL.Url + "FbwarehouseImg/" + filename;
                    try
                    {
                        img = web.DownloadData(url);
                    }
                    catch
                    {
                        img = null;
                    }
                    if (img != null)
                    {
                        ls.Add(new Image_View_Properties
                        {
                            Img = BitmapFactory.DecodeByteArray(img, 0, img.Length),
                            //Job = "Style : " + r["Style"].ToString() + "\nEmployee : " + r["EMPLOYEE"].ToString(),
                            //GarmentType = "Operation : " + r["OPERATION"].ToString(),
                            //RejectCode = "Reject : " + r["CODEDEFECT"].ToString() + " " + r["DFNAMEVN"].ToString() + " (" + r["DFNAMEEN"].ToString() + ")"
                        });
                        img = null; d++;
                    }
                }
                Toast.MakeText(context, "Load succeeded " + d.ToString() + "/" + dt.Rows.Count.ToString() + " pictures", ToastLength.Long).Show();
            }
            catch (Exception ex)
            {
                Toast.MakeText(context, ex.ToString(), ToastLength.Long).Show();
            }
        }
    }
    class Image_View_List_Defect
    {
        static byte[] img = null;
        static WebClient web = new WebClient();
        public static DataTable dt = new DataTable();
        public static List<Image_View_Properties> GetData(Context context)
        {
            dt = CSDL.dtImg;
            List<Image_View_Properties> ls = new List<Image_View_Properties>();
            Inline(ls, context);

            web.DownloadDataCompleted += Web_DownloadDataCompleted;

            return ls;
        }
        private static void Web_DownloadDataCompleted(object sender, DownloadDataCompletedEventArgs e)
        {
            img = e.Result;
        }
        private static void Inline(List<Image_View_Properties> ls, Context context)
        {
            try
            {
                int d = 0;
                foreach (DataRow r in dt.Rows)
                {
                    string url = "";
                    if (r[4].ToString() != "")
                    {
                        string urlImg = r[4].ToString().Split(',')[0];
                        url = CSDL.Url + "FbwarehouseImg/" + r[4].ToString() + ".jpg";
                        try
                        {
                            img = web.DownloadData(url);
                        }
                        catch
                        {
                            img = null;
                        }
                    }

                    if (img != null)
                    {
                        ls.Add(new Image_View_Properties
                        {
                            Img = BitmapFactory.DecodeByteArray(img, 0, img.Length),
                            Job = CSDL.Language("FB0050") + " : " + r[1].ToString(),
                            GarmentType = CSDL.Language("FB0051") + " : " + r[2].ToString(),
                            RejectCode = CSDL.Language("CL0014") + " : " + r[3].ToString()
                        });
                        img = null; d++;
                    }
                    else
                    {
                        ls.Add(new Image_View_Properties
                        {
                            //Img = BitmapFactory.DecodeByteArray(img, 0, img.Length),
                            Job = CSDL.Language("FB0050") + " : " + r[1].ToString(),
                            GarmentType = CSDL.Language("FB0051") + " : " + r[2].ToString(),
                            RejectCode = CSDL.Language("CL0014") + " : " + r[3].ToString()
                        });
                        img = null; d++;
                    }
                }
                Toast.MakeText(context, CSDL.Language("SEWEND53") + " " + d.ToString() + "/" + dt.Rows.Count.ToString() + " " + CSDL.Language("FB0080"), ToastLength.Long).Show();
            }
            catch (Exception ex) { Toast.MakeText(context, ex.ToString(), ToastLength.Long).Show(); }
        }
    }
    class Img_Report_View
    {
        static byte[] img = null;
        static WebClient web = new WebClient();
        public static DataTable dt = new DataTable();
        public static List<Image_View_Properties> GetData(Context context)
        {
            dt = CSDL.dtImgRP;
            List<Image_View_Properties> ls = new List<Image_View_Properties>();
            Inline(ls, context);

            web.DownloadDataCompleted += Web_DownloadDataCompleted;

            return ls;
        }
        private static void Web_DownloadDataCompleted(object sender, DownloadDataCompletedEventArgs e)
        {
            img = e.Result;
        }
        private static void Inline(List<Image_View_Properties> ls, Context context)
        {
            try
            {
                int d = 0;
                foreach (DataRow r in CSDL.dtImgRP.Rows)
                {
                    string url = "";
                    if (r[0].ToString() != "")
                    {
                        string urlImg = r[0].ToString();
                        url = CSDL.Url + "FbwarehouseImg/" + r[0].ToString() + ".jpg";
                        try
                        {
                            img = web.DownloadData(url);
                        }
                        catch
                        {
                            img = null;
                        }
                    }

                    if (img != null)
                    {
                        ls.Add(new Image_View_Properties
                        {
                            Img = BitmapFactory.DecodeByteArray(img, 0, img.Length)
                        });
                        img = null; d++;
                    }
                }
                Toast.MakeText(context, CSDL.Language("SEWEND53") + " " + d.ToString() + "/" + dt.Rows.Count.ToString() + " " + CSDL.Language("FB0080"), ToastLength.Long).Show();
            }
            catch (Exception ex) { Toast.MakeText(context, ex.ToString(), ToastLength.Long).Show(); }
        }
    }
    internal class FlagKeeper<T> : Java.Lang.Object
    {
        private T _value;
        public FlagKeeper(T managedValue)
        {
            _value = managedValue;
        }
        public T Value { get { return _value; } }
    }

    public class Root
    {
        public string Status { get; set; }
        public Dictionary<string, double> Defect { get; set; } // Sử dụng Dictionary để lưu động
        public Features Features { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class Features
    {
        public string SupplierName { get; set; }
        public double LengthOfRollInvoice { get; set; }
        public string IndentityQrCodeOfRoll { get; set; }
        public string ColorName { get; set; }
        public string Description { get; set; }
        public string FabricPrint { get; set; }
        public string FabricStructure { get; set; }
        public string FabricType { get; set; }
        public string ColorTone { get; set; }
    }

    public class Confidance
    {
        public double Zero { get; set; }
        public double One { get; set; }
    }

    public class Features_
    {
        public string SupplierName { get; set; }
        public double LengthOfRollInvoice { get; set; }
        public string IndentityQrCodeOfRoll { get; set; }
        public string ColorName { get; set; }
        public string Description { get; set; }
        public string FabricPrint { get; set; }
        public string FabricStructure { get; set; }
        public string FabricType { get; set; }
        public string ColorTone { get; set; }
    }

    public class Root_
    {
        public string Status { get; set; }
        public int Prediction { get; set; }
        public Confidance Confidance { get; set; }
        public Features Features { get; set; }
        public DateTime Timestamp { get; set; }
    }
}