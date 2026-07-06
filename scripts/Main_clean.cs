using Android.App;
using Android.Content;
using Android.Graphics;
using Android.Graphics.Text;
using Android.OS;
using Android.Runtime;
using Android.Util;
using Android.Views;
using Android.Widget;
using ComGoogleZxingIntegrationAndroid;
using Newtonsoft.Json;
using Org.Json;
using Plugin.Media;
using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using UpdateManager;
using ZXing.Mobile;
using static Android.Provider.DocumentsContract;

namespace QCFW
{
    [Activity(Label = "Main", Theme = "@style/Theme.AppCompat.Light.NoActionBar", ScreenOrientation = Android.Content.PM.ScreenOrientation.SensorLandscape, WindowSoftInputMode = Android.Views.SoftInput.StateHidden, NoHistory = false)]
    public class Main : Activity
    {
        TextView textView1, textView11, textView12, textView13, textView14, textView15, textView16, textView17, textView18, textView19, textView20, textView21, textView22, textView23, textView24, textView25, textView26, textView29, textView30, textView31, textView32, textView33, textView34, textView35,
            tvInv, tvSup, tvPO, tvItem, tvColor, tvLot, tvRoll, tvNW, tvGW, tvWidth, tvYard, tvMoisture, tvDefect, tvPoint, tvGSM;
        EditText edCodeReader, edWB, edWM, edWE, edYard, edMoisture, edDistance2Stripes, edLengthCycleStandard, edLengthCycleActual, edCycleNumber, edCycleHori, edCycleVer, edGSM, edPallet, edNote;
        Button btAdd, btColor, btHandfeel, btOdorTest, btRefresh, btClearDF, btConfirm, btViewList, btReport;
        CheckBox chkAddNew, chkCycle;
        ListView lvDefect;
        ImageView imgDF;

        DataTable dtCust = new DataTable(), dtDefect = new DataTable(), dtAddDF = new DataTable();
        List<string> lsCust = new List<string>();
        System.Timers.Timer tm = new System.Timers.Timer();
        Handler h = new Handler();
        string QrCode = "", pos = "", LinkImg = "", YRep = "", path = "", NmImg = "", pathRs = "";
        int color = 0, handfeel = 0, odortest = 0;
        List<int> lsPoint = new List<int>() { 1, 2, 3, 4 };
        byte[] ImageByteArray = new byte[] { };
        bool isClearing = false;
        string saveLang = "";
        protected override void OnCreate(Bundle savedInstanceState)
        {
            base.OnCreate(savedInstanceState);
            SetContentView(Resource.Layout.main);
            MobileBarcodeScanner.Initialize(Application);
            //RequestInit.Init(this);
            // Create your application here
            Toast.MakeText(this, CSDL.Language("M00020"), ToastLength.Short).Show();

            RelativeLayout rl = FindViewById<RelativeLayout>(Resource.Id.rlMain);
            CSDL.rq.Steching(rl);

            #region TextView
            textView1 = FindViewById<TextView>(Resource.Id.textView1);
            textView11 = FindViewById<TextView>(Resource.Id.textView11);
            textView12 = FindViewById<TextView>(Resource.Id.textView12);
            textView13 = FindViewById<TextView>(Resource.Id.textView13);
            textView14 = FindViewById<TextView>(Resource.Id.textView14);
            textView15 = FindViewById<TextView>(Resource.Id.textView15);
            textView16 = FindViewById<TextView>(Resource.Id.textView16);
            textView17 = FindViewById<TextView>(Resource.Id.textView17);
            textView18 = FindViewById<TextView>(Resource.Id.textView18);
            textView19 = FindViewById<TextView>(Resource.Id.textView19);
            textView20 = FindViewById<TextView>(Resource.Id.textView20);
            textView21 = FindViewById<TextView>(Resource.Id.textView21);
            textView22 = FindViewById<TextView>(Resource.Id.textView22);
            textView23 = FindViewById<TextView>(Resource.Id.textView23);
            textView24 = FindViewById<TextView>(Resource.Id.textView24);
            textView25 = FindViewById<TextView>(Resource.Id.textView25);
            textView26 = FindViewById<TextView>(Resource.Id.textView26);
            textView29 = FindViewById<TextView>(Resource.Id.textView29);
            textView30 = FindViewById<TextView>(Resource.Id.textView30);
            textView31 = FindViewById<TextView>(Resource.Id.textView31);
            textView32 = FindViewById<TextView>(Resource.Id.textView32);
            textView33 = FindViewById<TextView>(Resource.Id.textView33);
            textView34 = FindViewById<TextView>(Resource.Id.textView34);
            textView35 = FindViewById<TextView>(Resource.Id.textView35);

            tvInv = FindViewById<TextView>(Resource.Id.tvInv);
            tvSup = FindViewById<TextView>(Resource.Id.tvSup);
            tvPO = FindViewById<TextView>(Resource.Id.tvPO);
            tvItem = FindViewById<TextView>(Resource.Id.tvItem);
            tvColor = FindViewById<TextView>(Resource.Id.tvColor);
            tvLot = FindViewById<TextView>(Resource.Id.tvLot);
            tvRoll = FindViewById<TextView>(Resource.Id.tvRoll);
            tvNW = FindViewById<TextView>(Resource.Id.tvNW);
            tvGW = FindViewById<TextView>(Resource.Id.tvGW);
            tvWidth = FindViewById<TextView>(Resource.Id.tvWidth);
            tvYard = FindViewById<TextView>(Resource.Id.tvYard);
            tvMoisture = FindViewById<TextView>(Resource.Id.tvMoisture);
            tvDefect = FindViewById<TextView>(Resource.Id.tvDefect);
            tvPoint = FindViewById<TextView>(Resource.Id.tvPoint);
            tvGSM = FindViewById<TextView>(Resource.Id.tvGSM);
            #endregion
            #region Button
            btAdd = FindViewById<Button>(Resource.Id.btAdd);
            btColor = FindViewById<Button>(Resource.Id.btColor);
            btHandfeel = FindViewById<Button>(Resource.Id.btHandfeel);
            btOdorTest = FindViewById<Button>(Resource.Id.btOdorTest);
            btRefresh = FindViewById<Button>(Resource.Id.btRefresh);
            btClearDF = FindViewById<Button>(Resource.Id.btClearDF);
            btConfirm = FindViewById<Button>(Resource.Id.btConfirm);
            btViewList = FindViewById<Button>(Resource.Id.btViewList);
            btReport = FindViewById<Button>(Resource.Id.btReport);
            #endregion/
            #region Checkbox
            chkAddNew = FindViewById<CheckBox>(Resource.Id.chkAddNew);
            chkCycle = FindViewById<CheckBox>(Resource.Id.chkCycle);
            #endregion
            #region EditText
            edCodeReader = FindViewById<EditText>(Resource.Id.edCodeReader);
            edWB = FindViewById<EditText>(Resource.Id.edWB);
            edWM = FindViewById<EditText>(Resource.Id.edWM);
            edWE = FindViewById<EditText>(Resource.Id.edWE);
            edYard = FindViewById<EditText>(Resource.Id.edYard);
            edMoisture = FindViewById<EditText>(Resource.Id.edMoisture);
            edDistance2Stripes = FindViewById<EditText>(Resource.Id.edDistance2Stripes);
            edLengthCycleStandard = FindViewById<EditText>(Resource.Id.edLengthCycleStandard);
            edLengthCycleActual = FindViewById<EditText>(Resource.Id.edLengthCycleActual);
            edCycleNumber = FindViewById<EditText>(Resource.Id.edCycleNumber);
            edCycleHori = FindViewById<EditText>(Resource.Id.edCycleHori);
            edCycleVer = FindViewById<EditText>(Resource.Id.edCycleVer);
            edGSM = FindViewById<EditText>(Resource.Id.edGSM);
            edPallet = FindViewById<EditText>(Resource.Id.edPallet);
            edNote = FindViewById<EditText>(Resource.Id.edNote);
            #endregion
            #region ListView
            lvDefect = FindViewById<ListView>(Resource.Id.lvDefect);
            #endregion
            #region ImageView
            imgDF = FindViewById<ImageView>(Resource.Id.imgDF);
            #endregion

            LoadingLanguage();
            //edCodeReader.Text = "9b0b8116bfcae18d155dbfe9a5443fb6";

            #region Event
            textView1.Click += async delegate
            {
                if (lsCust.Contains(textView1.Text))
                {
                    try
                    {
                        //  var scanner = new MobileBarcodeScanner();
                        //  var options = new MobileBarcodeScanningOptions();
                        //  options.PossibleFormats = new List<ZXing.BarcodeFormat>()
                        //{
                        //  ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.CODE_128
                        //};
                        //  var result = await scanner.Scan();
                        //  if (result != null)
                        //  {
                        //      edCodeReader.Text = result.Text;
                        //  }
                        //  else { }
                        IntentIntegrator intentIntegrator = new IntentIntegrator(this);
                        intentIntegrator.InitiateScan();
                    }
                    catch (Java.Lang.Exception ex)
                    {
                        Toast.MakeText(this, CSDL.Language("M00019"), ToastLength.Long).Show();
                    }
                }
                else Toast.MakeText(this, CSDL.Language("FB0109"), ToastLength.Short).Show();
            };
            textView1.LongClick += delegate
            {
                try
                {
                    AlertDialog.Builder builder = new AlertDialog.Builder(this);
                    builder.SetTitle("Customer");
                    ListView lv = new ListView(this);
                    lv.Adapter = new ArrayAdapter(this, Android.Resource.Layout.SimpleListItem1, lsCust.ToArray());
                    builder.SetView(lv);
                    Dialog dg = builder.Create();
                    dg.Show();
                    lv.ItemClick += (s, e) =>
                    {
                        textView1.Text = lv.GetItemAtPosition(e.Position).ToString();
                        dg.Dismiss();
                        ISharedPreferencesEditor editor = CSDL.pre.Edit();
                        editor.PutString("Cust", textView1.Text);
                        editor.Apply();
                    };
                }
                catch { Toast.MakeText(this, CSDL.Language("HT00060"), ToastLength.Short).Show(); }
            };
            textView11.Click += delegate
            {
                if (tvWidth.Text != "--")
                {
                    edWB.Text = tvWidth.Text;
                    edWM.Text = tvWidth.Text;
                    edWE.Text = tvWidth.Text;
                }
            };
            textView15.Click += delegate
            {
                if (tvYard.Text != "--")
                {
                    edYard.Text = tvYard.Text;
                }
            };
            textView17.Click += delegate
            {
                if (tvMoisture.Text != "---")
                {
                    edMoisture.Text = tvMoisture.Text;
                }
            };
            tvDefect.Click += delegate
            {
                try
                {
                    AlertDialog.Builder builder = new AlertDialog.Builder(this);
                    builder.SetTitle(CSDL.Language("FB0050"));
                    ListView lv = new ListView(this);
                    lv.Adapter = new ArrayAdapter(this, Android.Resource.Layout.SimpleListItem1, dtDefect.Rows.OfType<DataRow>().Select(dr => dr.Field<string>(1)).ToList().ToArray());
                    builder.SetView(lv);
                    Dialog dg = builder.Create();
                    dg.Show();
                    lv.ItemClick += (s, e) =>
                    {
                        string dfnm = lv.GetItemAtPosition(e.Position).ToString();
                        pos = e.Position.ToString();
                        Ms(CSDL.Language("FB0039") + " " + dfnm + " [" + pos + "]");
                        tvDefect.Text = dfnm;
                        dg.Dismiss();
                    };
                }
                catch { Ms(CSDL.Language("M00019")); }
            };
            tvPoint.Click += delegate
            {
                try
                {
                    AlertDialog.Builder builder = new AlertDialog.Builder(this);
                    builder.SetTitle(CSDL.Language("FB0051"));
                    ListView lv = new ListView(this);
                    lv.Adapter = new ArrayAdapter(this, Android.Resource.Layout.SimpleListItem1, lsPoint.ToArray());
                    builder.SetView(lv);
                    Dialog dg = builder.Create();
                    dg.Show();
                    lv.ItemClick += (s, e) =>
                    {
                        string point = lv.GetItemAtPosition(e.Position).ToString();
                        Ms(CSDL.Language("FB0039") + " " + CSDL.Language("FB0051") + " " + point);
                        tvPoint.Text = point;
                        dg.Dismiss();
                    };
                }
                catch { Ms(CSDL.Language("M00019")); }
            };
            textView32.LongClick += async delegate
            {
                try
                {
                    var scanner = new MobileBarcodeScanner();
                    var options = new MobileBarcodeScanningOptions();
                    options.PossibleFormats = new List<ZXing.BarcodeFormat>()
                      {
                        ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.CODE_128
                      };
                    var result = await scanner.Scan();
                    if (result != null)
                    {
                        edPallet.Text = result.Text.Replace(" ", "");
                    }
                    else { }
                }
                catch (Java.Lang.Exception ex)
                {
                    Toast.MakeText(this, CSDL.Language("M00019"), ToastLength.Long).Show();
                }
            };
            textView32.Click += delegate
            {
                edPallet.Text = "CutPallet";
            };
            textView35.Click += delegate
            {
                try
                {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 9,'" + CSDL.Fac + "','','','','','','','',''";
                    DataTable dt = CSDL.kn.Doc(s).Tables[0];
                    if (dt.Rows.Count > 0)
                    {
                        AlertDialog.Builder builder = new AlertDialog.Builder(this);
                        builder.SetTitle(CSDL.Language("SEWEND35"));
                        ListView lv = new ListView(this);
                        lv.Adapter = new ArrayAdapter(this, Android.Resource.Layout.SimpleListItem1, dt.Rows.OfType<DataRow>().Select(dr => dr.Field<string>(0)).ToList().ToArray());
                        builder.SetView(lv);
                        Dialog dg = builder.Create();
                        dg.Show();
                        lv.ItemClick += (s, e) =>
                        {
                            string str = lv.GetItemAtPosition(e.Position).ToString();
                            if (edNote.Text != "") edNote.Text += "," + str;
                            else edNote.Text = str;
                            dg.Dismiss();
                        };
                    }
                }
                catch { Ms(CSDL.Language("M00019")); }
            };

            tm.Enabled = true;
            tm.Interval = 5;
            tm.Elapsed += delegate
            {
                h.Post(() =>
                {
                    if (edCodeReader.Text != "")
                    {
                        tm.Stop();
                        LoadingQrCodeAsync(edCodeReader.Text);
                        edCodeReader.Text = "";
                    }
                });
            };

            edWB.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'wb','" + edWB.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.CallWaiting("");
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edWB.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edWB.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edWM.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'wm','" + edWM.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.CallWaiting("");
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edWM.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edWM.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edWE.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'we','" + edWE.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.CallWaiting("");
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edWE.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edWE.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edYard.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'ya','" + edYard.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.CallWaiting("");
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edYard.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edYard.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edMoisture.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'ms','" + edMoisture.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.CallWaiting("");
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edMoisture.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edMoisture.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edGSM.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'gsm','" + edGSM.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edGSM.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edGSM.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edDistance2Stripes.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'distance','" + edDistance2Stripes.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edDistance2Stripes.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edDistance2Stripes.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edLengthCycleStandard.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'cyclestandard','" + edLengthCycleStandard.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edLengthCycleStandard.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edLengthCycleStandard.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edLengthCycleActual.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'cycleac','" + edLengthCycleActual.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edLengthCycleActual.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edLengthCycleActual.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edCycleNumber.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'cyclenum','" + edCycleNumber.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edCycleNumber.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edCycleNumber.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edCycleHori.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'cyclehori','" + edCycleHori.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edCycleHori.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edCycleHori.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edCycleVer.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'cyclever','" + edCycleVer.Text.Trim() + "','" + QrCode + "','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edCycleVer.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edCycleVer.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edPallet.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'uppallet','" + QrCode + "',N'" + edPallet.Text.ToUpper() + "','" + CSDL.UserName + "','" + CSDL.Fac + "','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edPallet.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edPallet.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edPallet.LongClick += delegate { edPallet.Text = ""; };
            edNote.TextChanged += delegate
            {
                if (isClearing) return;
                try
            {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'upnote','" + QrCode + "',N'" + edNote.Text + "','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); edPallet.Text = ""; }
                }
                catch { Ms(CSDL.Language("M00019")); edPallet.Text = ""; }
                finally { CSDL.HideWaiting(); }
            };
            edCodeReader.TextChanged += delegate
            {
                if (edCodeReader.Text.Trim() != "")
                { tm.Start(); }
            };

            btColor.Click += delegate
            {
                try
                {
                    if (color == 0)
                    {
                        btColor.SetBackgroundColor(Color.Green);
                        color = 1;
                    }
                    else
                    {
                        btColor.SetBackgroundColor(Color.Red);
                        color = 0;
                    }
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'color','" + color + "','" + QrCode + "','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); }
                }
                catch { Ms(CSDL.Language("M00019")); }
            };
            btHandfeel.Click += delegate
            {
                try
                {
                    if (handfeel == 0)
                    {
                        btHandfeel.SetBackgroundColor(Color.Green);
                        handfeel = 1;
                    }
                    else
                    {
                        btHandfeel.SetBackgroundColor(Color.Red);
                        handfeel = 0;
                    }
                    string s = "exec InlineFBGetData 5,'handfeel','" + handfeel + "','" + QrCode + "','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") { Ms(CSDL.kn.ErrorMessage); }
                }
                catch { Ms(CSDL.Language("M00019")); }
            };
            btOdorTest.Click += delegate
            {
                try
                {
                    if (odortest.Equals(0))
                    {
                        btOdorTest.SetBackgroundColor(Color.Green);
                        odortest = 1;
                    }
                    else
                    {
                        btOdorTest.SetBackgroundColor(Color.Red);
                        odortest = 0;
                    }
                    string s = $"EXEC dbo.InlineFBGetData 5,'odortest','{odortest}','{QrCode}','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                }
                catch { Ms(CSDL.Language("M00019")); }
            };
            btAdd.Click += delegate
            {
                if (QrCode != "")
                {
                    if (tvDefect.Text != "-Select defect-")
                    {
                        try
                        {
                            if (path != "")
                            {
                                System.Net.WebClient cl = new System.Net.WebClient();
                                cl.Headers.Add("Content-Type", "binary/octet-stream");
                                byte[] rs = cl.UploadFile(CSDL.Url + "Fbwarehouseimg.php", path);
                                string rs_msg = System.Text.Encoding.UTF8.GetString(rs, 0, rs.Length);
                                Ms(rs_msg);
                                imgDF.SetImageResource(Resource.Drawable.background);
                                Ms(CSDL.Language("DECO66"));
                            }

                            if (chkCycle.Checked)
                            {
                                Ms(CSDL.Language("FB0039") + " : " + tvDefect.Text);
                                string dfcode = dtDefect.Rows[int.Parse(pos)][0].ToString();
                                string str = "exec DtradeProduction.dbo.InlineFBGetData 6,'" + QrCode + "','0','" + dfcode + "','1','" + YRep + "','" + LinkImg + "','" + CSDL.UserName + "','" + CSDL.Fac + "',''";
                                CSDL.kn.Doc(str);
                                if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                                else
                                {
                                    Ms(CSDL.Language("DECO77"));
                                    tvDefect.Text = "-Select defect-";
                                    string ss = "exec DtradeProduction.dbo.InlineFBGetData 7,'" + QrCode + "','','','','','','','',''";
                                    dtAddDF = CSDL.kn.Doc(ss).Tables[0];
                                    lvDefect.Adapter = new Adapter_Defect(dtAddDF);

                                    imgDF.SetImageResource(Resource.Drawable.wait);

                                    int point = 0;
                                    if (dtAddDF.Rows.Count > 0)
                                    {
                                        point = int.Parse(dtAddDF.Compute("sum(QtyDefect)", string.Empty).ToString());
                                        textView33.Text = CSDL.Language("FB0051") + " : " + point;
                                    }
                                    else
                                    {
                                        textView33.Text = CSDL.Language("FB0051") + " : 0";
                                        textView34.Text = CSDL.Language("FB0048") + " : 0";
                                    }
                                }
                            }
                            else
                            {
                                Ms(CSDL.Language("FB0039") + " : " + tvDefect.Text + "\n" + CSDL.Language("FB0051") + " : " + tvPoint.Text);
                                string dfcode = dtDefect.Rows[int.Parse(pos)][0].ToString();
                                string str = "exec DtradeProduction.dbo.InlineFBGetData 6,'" + QrCode + "','" + tvPoint.Text + "','" + dfcode + "','1','" + YRep + "','" + LinkImg + "','" + CSDL.UserName + "','" + CSDL.Fac + "',''";
                                CSDL.kn.Doc(str);
                                if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                                else
                                {
                                    Ms(CSDL.Language("DECO77"));
                                    tvDefect.Text = "-Select defect-";
                                    string ss = "exec DtradeProduction.dbo.InlineFBGetData 7,'" + QrCode + "','','','','','','','',''";
                                    dtAddDF = CSDL.kn.Doc(ss).Tables[0];
                                    lvDefect.Adapter = new Adapter_Defect(dtAddDF);

                                    int point = 0;
                                    if (dtAddDF.Rows.Count > 0)
                                    {
                                        foreach (DataRow r in dtAddDF.Rows)
                                        {
                                            point += int.Parse(r["QtyDefect"].ToString()) * int.Parse(r["DefectPoint"].ToString());
                                        }
                                        float avg = CalculatorPoint(point, float.Parse(tvYard.Text.Trim().Replace(",", ".")), float.Parse(tvWidth.Text.Trim().Replace(",", ".")));
                                        textView33.Text = CSDL.Language("FB0051") + " : " + point;
                                        textView34.Text = CSDL.Language("FB0048") + " : " + Math.Round(avg, 0).ToString();
                                        string status = "";
                                        if (avg <= 15)
                                        {
                                            status = "P";
                                            imgDF.SetImageResource(Resource.Drawable.wait);
                                        }
                                        else
                                        {
                                            status = "F";
                                            imgDF.SetImageResource(Resource.Drawable.fail);
                                        }

                                        string sUp = "exec DtradeProduction.dbo.InlineFBGetData 5,'uppoint','" + QrCode + "','" + status + "','" + Math.Round(avg, 0).ToString() + "','','','','',''";
                                        CSDL.kn.Doc(sUp);
                                        if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                                        else Ms("Calculator Point Complete !");
                                    }
                                    else
                                    {
                                        textView33.Text = CSDL.Language("FB0051") + " : 0";
                                        textView34.Text = CSDL.Language("FB0048") + " : 0";
                                    }
                                }
                            }

                            path = "";
                            LinkImg = "";
                        }
                        catch { Ms(CSDL.Language("DECO78")); }

                    }
                    else Ms(CSDL.Language("SEWIN42") + " " + CSDL.Language("FB0050"));
                }
                else Ms(CSDL.Language("M00043"));
            };
            btRefresh.Click += delegate { ClearData(); };
            btClearDF.Click += delegate
            {
                AlertDialog.Builder builder = new AlertDialog.Builder(this);
                builder.SetTitle(CSDL.Language("M00086"));
                builder.SetMessage(CSDL.Language("FB0100"));
                builder.SetPositiveButton(CSDL.Language("M00115"), delegate
                {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'delalldf','" + QrCode + "','','','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                    else
                    {
                        Ms(CSDL.Language("DECO72"));
                        lvDefect.Adapter = null;
                        dtAddDF.Rows.Clear();
                        textView33.Text = CSDL.Language("FB0051") + " : 0";
                        textView34.Text = CSDL.Language("FB0048") + " : 0";
                    }
                });
                builder.SetNegativeButton(CSDL.Language("FB0024"), delegate { return; });
                builder.Create().Show();
            };
            btConfirm.Click += delegate
            {
                ClearData();
                Ms(CSDL.Language("FB0036"));
            };
            btViewList.Click += async delegate
            {
                Ms(CSDL.Language("M00057"));
                await Task.Delay(1000);

                StartActivity(new Intent(this, typeof(UpdateLocation)));
            };
            btReport.LongClick += async delegate
            {
                try
                {
                    NmImg = DateTime.Now.ToString("yyyyMMddHHmmss") + "_" + CSDL.UserName + "_" + CSDL.Fac;
                    if (QrCode != "")
                    {
                        if (!CrossMedia.Current.IsCameraAvailable || !CrossMedia.Current.IsTakePhotoSupported)
                        {
                            Toast.MakeText(this, "No Camera", ToastLength.Long).Show();
                            return;
                        }
                        var media = new MediaImplementation();
                        var file = await CrossMedia.Current.TakePhotoAsync(new Plugin.Media.Abstractions.StoreCameraMediaOptions
                        {
                            Directory = "Pictures",
                            Name = NmImg,
                            SaveToAlbum = true,
                            PhotoSize = Plugin.Media.Abstractions.PhotoSize.Full,
                            DefaultCamera = Plugin.Media.Abstractions.CameraDevice.Rear
                        });
                        if (file == null)
                        {
                            pathRs = "";
                            NmImg = "";
                            return;
                        }

                        pathRs = file.Path;
                        Ms(pathRs);

                        var bitmap = BitmapFactory.DecodeFile(pathRs);
                        imgDF.SetImageBitmap(bitmap);
                    }
                }
                catch (Exception ex) { Ms(ex.ToString()); }
            };
            btReport.Click += delegate
            {
                if (pathRs != "")
                {
                    try
                    {
                        System.Net.WebClient cl = new System.Net.WebClient();
                        cl.Headers.Add("Content-Type", "binary/octet-stream");
                        byte[] rs = cl.UploadFile(CSDL.Url + "Fbwarehouseimg.php", pathRs);
                        string rs_msg = System.Text.Encoding.UTF8.GetString(rs, 0, rs.Length);
                        Ms(rs_msg);
                        imgDF.SetImageResource(Resource.Drawable.background);
                        Ms(CSDL.Language("DECO66"));

                        string str = "exec DtradeProduction.dbo.InlineFBGetData 5,'upimgreport','" + QrCode + "','" + NmImg + "','','','','','',''";
                        CSDL.kn.Doc(str);
                        if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                        else
                        {
                            Ms(CSDL.Language("DECO66"));
                            pathRs = "";
                            NmImg = "";
                        }
                    }
                    catch { }
                }
            };

            imgDF.Click += delegate
            {
                AlertDialog.Builder builder = new AlertDialog.Builder(this);
                builder.SetTitle("Options");
                LinearLayout ln = new LinearLayout(this) { Orientation = Orientation.Horizontal };
                RadioGroup radG = new RadioGroup(this);
                RadioButton radSelectFromDevice = new RadioButton(this) { Text = CSDL.Language("SEWIN48") };
                RadioButton radTakePictures = new RadioButton(this) { Text = CSDL.Language("SEWIN47") };
                radG.AddView(radTakePictures);
                radG.AddView(radSelectFromDevice);
                ln.AddView(radG);
                builder.SetView(ln);
                Dialog dg = builder.Create();
                dg.Show();
                radTakePictures.CheckedChange += async delegate
                {
                    path = "";
                    LinkImg = DateTime.Now.ToString("yyyyMMdd_HHmmss") + "_" + CSDL.UserName + "_" + CSDL.Fac;
                    try
                    {
                        if (QrCode != "")
                        {
                            if (!CrossMedia.Current.IsCameraAvailable || !CrossMedia.Current.IsTakePhotoSupported)
                            {
                                Toast.MakeText(this, "No Camera", ToastLength.Long).Show();
                                return;
                            }
                            var media = new MediaImplementation();
                            var file = await CrossMedia.Current.TakePhotoAsync(new Plugin.Media.Abstractions.StoreCameraMediaOptions
                            {
                                Directory = "Pictures",
                                Name = LinkImg,
                                SaveToAlbum = true,
                                PhotoSize = Plugin.Media.Abstractions.PhotoSize.Full,
                                DefaultCamera = Plugin.Media.Abstractions.CameraDevice.Rear
                            });
                            if (file == null)
                            {
                                path = "";
                                LinkImg = "";
                                return;
                            }

                            path = file.Path;
                            Ms(path);
                            //System.Diagnostics.Debug.WriteLine(path);

                            var bitmap = BitmapFactory.DecodeFile(path);
                            imgDF.SetImageBitmap(bitmap);
                            //MemoryStream ms = new MemoryStream();
                            //bitmap.Compress(Bitmap.CompressFormat.Png, 0, ms);
                            //ImageByteArray = ms.ToArray();
                            //file.Dispose();
                        }
                    }
                    catch (Exception ex) { Ms(ex.ToString()); }
                    dg.Dismiss();
                };
                radSelectFromDevice.CheckedChange += delegate
                {
                    Intent imageIntent = new Intent();
                    imageIntent.SetType("image/*");
                    imageIntent.SetAction(Intent.ActionGetContent);
                    StartActivityForResult(Intent.CreateChooser(imageIntent, "Select photo"), 0);
                    dg.Dismiss();
                };
            };
            imgDF.LongClick += async delegate
            {
                try
                {
                    string str = "exec DtradeProduction.dbo.InlineFBGetData 12,'" + QrCode + "','','','','','','','',''";
                    DataTable dtt = CSDL.kn.Doc(str).Tables[0];
                    if (dtt.Rows.Count > 0)
                    {
                        CSDL.dtImgRP.Columns.Add("Img");
                        string[] arr = dtt.Rows[0][0].ToString().Split(',');
                        foreach (string sr in arr)
                        {
                            DataRow dr = CSDL.dtImgRP.NewRow();
                            dr[0] = sr;
                            CSDL.dtImgRP.Rows.Add(dr);
                        }

                        Ms(CSDL.Language("DECO100"));
                        await Task.Delay(1000);

                        StartActivity(new Intent(this, typeof(ImgReport)));
                    }
                }
                catch { Ms(CSDL.Language("M00019")); }
            };

            lvDefect.ItemLongClick += (s, e) =>
            {
                AlertDialog.Builder builder = new AlertDialog.Builder(this);
                builder.SetTitle(CSDL.Language("M00086"));
                builder.SetMessage(CSDL.Language("M00166") + " [" + dtAddDF.Rows[e.Position]["DefectName"].ToString() + "]");
                builder.SetPositiveButton(CSDL.Language("M00115"), delegate
                {
                    string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'deldf','" + QrCode + "','" + dtAddDF.Rows[e.Position]["DefectCode"].ToString() + "','" + dtAddDF.Rows[e.Position]["DefectPoint"].ToString() + "','','','','',''";
                    CSDL.kn.Doc(s);
                    if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                    else
                    {
                        Ms(CSDL.Language("DECO72"));
                        string ss = "exec DtradeProduction.dbo.InlineFBGetData 7,'" + QrCode + "','','','','','','','',''";
                        dtAddDF = CSDL.kn.Doc(ss).Tables[0];
                        lvDefect.Adapter = new Adapter_Defect(dtAddDF);

                        int point = 0;
                        if (dtAddDF.Rows.Count > 0)
                        {
                            foreach (DataRow r in dtAddDF.Rows)
                            {
                                point += int.Parse(r["QtyDefect"].ToString()) * int.Parse(r["DefectPoint"].ToString());
                            }
                            float avg = CalculatorPoint(point, float.Parse(tvYard.Text.Trim().Replace(",", ".")), float.Parse(tvWidth.Text.Trim().Replace(",", ".")));
                            textView33.Text = CSDL.Language("FB0051") + " : " + point;
                            textView34.Text = CSDL.Language("FB0048") + " : " + Math.Round(avg, 0).ToString();

                            string status = "";
                            if (avg <= 15)
                            {
                                status = "P";
                                imgDF.SetImageResource(Resource.Drawable.pass);
                            }
                            else
                            {
                                status = "F";
                                imgDF.SetImageResource(Resource.Drawable.fail);
                            }
                        }
                        else
                        {
                            textView33.Text = CSDL.Language("FB0051") + " : 0";
                            textView34.Text = CSDL.Language("FB0048") + " : 0";
                            imgDF.SetImageResource(Resource.Drawable.background);
                        }
                    }
                });
                builder.SetNegativeButton(CSDL.Language("FB0024"), delegate { return; });
                builder.Create().Show();
            };
            lvDefect.ItemClick += async (s, e) =>
            {
                AlertDialog.Builder builder = new AlertDialog.Builder(this);
                builder.SetTitle("Options");
                LinearLayout ln = new LinearLayout(this);
                RadioGroup radG = new RadioGroup(this) { Orientation = Orientation.Horizontal };
                RadioButton radViewImage = new RadioButton(this) { Text = CSDL.Language("SEWIN50"), TextSize = CSDL.rq.TextSize(16f) };
                RadioButton radChangeQty = new RadioButton(this) { Text = CSDL.Language("CL0014"), TextSize = CSDL.rq.TextSize(16f) };
                radG.AddView(radViewImage);
                radG.AddView(radChangeQty);
                ln.AddView(radG);
                builder.SetView(ln);
                Dialog dg = builder.Create();
                dg.Show();

                radViewImage.CheckedChange += async delegate
                {
                    Ms(CSDL.Language("DECO100"));
                    await Task.Delay(1000);

                    string img = dtAddDF.Rows[e.Position]["PicLink"].ToString();
                    if (img != "")
                    {
                        string[] arrImg = img.Split(',');
                        CSDL.dtImg = new DataTable();
                        CSDL.dtImg.Columns.Add("Img", typeof(string));
                        foreach (string str in arrImg)
                        {
                            DataRow r = CSDL.dtImg.NewRow();
                            r[0] = str;
                            CSDL.dtImg.Rows.Add(r);
                        }
                        StartActivity(new Intent(this, typeof(Image_View)));
                    }
                    else Ms(CSDL.Language("DECO63"));
                    dg.Dismiss();
                };
                radChangeQty.CheckedChange += delegate
                {
                    AlertDialog.Builder builder1 = new AlertDialog.Builder(this);
                    builder1.SetTitle("Change Qty");
                    LinearLayout ln = new LinearLayout(this) { Orientation = Orientation.Vertical };
                    TextView tv = new TextView(this) { Text = "Qty", TextSize = CSDL.rq.TextSize(16f) };
                    EditText edQty = new EditText(this) { InputType = Android.Text.InputTypes.ClassNumber, TextSize = CSDL.rq.TextSize(16f) };
                    ln.AddView(tv);
                    ln.AddView(edQty);
                    builder1.SetView(ln);
                    builder1.SetPositiveButton(CSDL.Language("IL0015"), delegate
                    {
                        if (edQty.Text != "")
                        {
                            string s = "exec DtradeProduction.dbo.InlineFBGetData 5,'changeqty','" + QrCode + "','" + dtAddDF.Rows[e.Position]["DefectCode"].ToString() + "','" + dtAddDF.Rows[e.Position]["DefectPoint"].ToString() + "','" + edQty.Text.Trim() + "','','','',''";
                            CSDL.kn.Doc(s);
                            if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                            else
                            {
                                Ms(CSDL.Language("SEWEND67"));
                                string ss = "exec DtradeProduction.dbo.InlineFBGetData 7,'" + QrCode + "','','','','','','','',''";
                                dtAddDF = CSDL.kn.Doc(ss).Tables[0];
                                lvDefect.Adapter = new Adapter_Defect(dtAddDF);

                                int point = 0;
                                if (dtAddDF.Rows.Count > 0)
                                {
                                    foreach (DataRow r in dtAddDF.Rows)
                                    {
                                        point += int.Parse(r["QtyDefect"].ToString()) * int.Parse(r["DefectPoint"].ToString());
                                    }
                                    float avg = CalculatorPoint(point, float.Parse(tvYard.Text.Trim().Replace(",", ".")), float.Parse(tvWidth.Text.Trim().Replace(",", ".")));
                                    textView33.Text = CSDL.Language("FB0051") + " : " + point;
                                    textView34.Text = CSDL.Language("FB0048") + " : " + Math.Round(avg, 0).ToString();

                                    string status = "";
                                    if (avg <= 15)
                                    {
                                        status = "P";
                                        imgDF.SetImageResource(Resource.Drawable.pass);
                                    }
                                    else
                                    {
                                        status = "F";
                                        imgDF.SetImageResource(Resource.Drawable.fail);
                                    }

                                    string sUp = "exec DtradeProduction.dbo.InlineFBGetData 5,'uppoint','" + QrCode + "','" + status + "','" + Math.Round(avg, 0).ToString() + "','','','','',''";
                                    CSDL.kn.Doc(sUp);
                                    if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                                    else Ms("Calculator Point Complete !");
                                }
                                else
                                {
                                    textView33.Text = CSDL.Language("FB0051") + " : 0";
                                    textView34.Text = CSDL.Language("FB0048") + " : 0";
                                    imgDF.SetImageResource(Resource.Drawable.background);
                                }
                            }
                        }
                        else Ms(CSDL.Language("SEWIN30"));
                        dg.Dismiss();
                    });
                    builder1.SetNegativeButton(CSDL.Language("FB0111"), delegate { return; });
                    builder1.Create().Show();
                };
            };

            chkCycle.CheckedChange += delegate
                {
                    if (chkCycle.Checked)
                    {
                        Ms(CSDL.Language("FB0039") + " " + CSDL.Language("FB0044"));
                        edDistance2Stripes.Enabled = true;
                        edLengthCycleStandard.Enabled = true;
                        edLengthCycleActual.Enabled = true;
                        edCycleNumber.Enabled = true;
                        edCycleHori.Enabled = true;
                        edCycleVer.Enabled = true;
                        textView34.Visibility = ViewStates.Invisible;
                    }
                    else
                    {
                        Ms(CSDL.Language("FB0039") + " " + CSDL.Language("FB0043"));
                        edDistance2Stripes.Enabled = false;
                        edLengthCycleStandard.Enabled = false;
                        edLengthCycleActual.Enabled = false;
                        edCycleNumber.Enabled = false;
                        edCycleHori.Enabled = false;
                        edCycleVer.Enabled = false;
                        textView34.Visibility = ViewStates.Visible;
                    }
                };

            tvRoll.Click += delegate { if (!string.IsNullOrEmpty(jsonListDF)) showAIRedic(); else Toast.MakeText(this, "AI no have data !", ToastLength.Short).Show(); };

            string str = "select * from DtradeProduction.dbo.InlineFBDefect";
            try
            {
                DataTable dt = CSDL.kn.Doc(str).Tables[0];
                saveLang = CSDL.pre.GetString("Lang", "").ToString();
                if (saveLang != "EN")
                    dtDefect = dt.DefaultView.ToTable(true, "DefectCode", "DefectName");
                else
                    dtDefect = dt.DefaultView.ToTable(true, "DefectCode", "Desc1");
            }
            catch { Ms(CSDL.Language("M00019") + "\n...defect..."); }
            #endregion
        }
        [Obsolete]
        private string GetPathToImage(Android.Net.Uri uri)
        {
            string doc_id = "";
            using (var c1 = ContentResolver.Query(uri, null, null, null, null))
            {
                c1.MoveToFirst();
                string document_id = c1.GetString(0);
                doc_id = document_id.Substring(document_id.LastIndexOf(":") + 1);
            }

            string path = null;

            // The projection contains the columns we want to return in our query.
            string selection = Android.Provider.MediaStore.Images.Media.InterfaceConsts.Id + " =? ";
            using (var cursor = ContentResolver.Query(Android.Provider.MediaStore.Images.Media.ExternalContentUri, null, selection, new string[] { doc_id }, null))
            {
                if (cursor == null) return path;
                var columnIndex = cursor.GetColumnIndexOrThrow(Android.Provider.MediaStore.Images.Media.InterfaceConsts.Data);
                cursor.MoveToFirst();
                path = cursor.GetString(columnIndex);
            }
            return path;
        }

        [Obsolete]
        protected override void OnActivityResult(int requestCode, Result resultCode, Intent data)
        {
            try
            {
                base.OnActivityResult(requestCode, resultCode, data);
                if (requestCode == 0)
                {
                    Android.Net.Uri uri = data.Data;
                    if (path == "") path = GetPathToImage(uri);
                    LinkImg = System.IO.Path.GetFileName(path);
                    Bitmap bitmaps = BitmapFactory.DecodeFile(path);
                    imgDF.SetImageBitmap(bitmaps);
                }
            }
            catch { }

            IntentResult result = IntentIntegrator.ParseActivityResult(requestCode, (int)resultCode, data);
            if (result != null)
            {
                if (result.Contents == null)
                {
                    Log.Debug("MainActivity", "Cancelled scan");
                    Toast.MakeText(this, "Cancelled", ToastLength.Long).Show();
                }
                else
                {
                    edCodeReader.Text = result.Contents;
                }
            }

        }
        private void LoadingLanguage()
        {
            textView1.Text = CSDL.Language("M00073");
            textView11.Text = CSDL.Language("FB0052");
            textView12.Text = CSDL.Language("FB0053");
            textView13.Text = CSDL.Language("FB0054");
            textView14.Text = CSDL.Language("FB0055");
            textView15.Text = CSDL.Language("FB0056");
            textView16.Text = CSDL.Language("FB0057");
            textView17.Text = CSDL.Language("FB0067");
            textView18.Text = CSDL.Language("FB0068");
            textView19.Text = CSDL.Language("FB0058");
            textView20.Text = CSDL.Language("FB0106");
            textView21.Text = CSDL.Language("FB0107");
            textView22.Text = CSDL.Language("FB0108");
            textView23.Text = CSDL.Language("FB0050");
            textView24.Text = CSDL.Language("FB0051");
            textView25.Text = CSDL.Language("FB0063");
            textView26.Text = CSDL.Language("FB0064");
            textView29.Text = CSDL.Language("FB0050");
            textView30.Text = CSDL.Language("FB0051");
            textView31.Text = CSDL.Language("CL0014");
            textView33.Text = CSDL.Language("FB0051") + " : 0";
            textView34.Text = CSDL.Language("FB0048") + " : 0";
            textView35.Text = CSDL.Language("SEWEND35");

            chkCycle.Text = CSDL.Language("FB0044");
            btAdd.Text = CSDL.Language("M00151");
            chkAddNew.Text = CSDL.Language("M00085");

            btRefresh.Text = CSDL.Language("FB0045");
            btClearDF.Text = CSDL.Language("FB0105");
            btConfirm.Text = CSDL.Language("SEWEND41");
            btViewList.Text = CSDL.Language("DECO43");

            try
            {
                dtCust = CSDL.kn.Doc("select distinct CustmName from DtradeProduction.dbo.InlineFGsWHCTNCustmMgnt").Tables[0];
                lsCust = dtCust.Rows.OfType<DataRow>().Select(dr => dr.Field<string>(0)).ToList();
                try
                {
                    string cust = CSDL.pre.GetString("Cust", "");
                    if (cust != "") textView1.Text = cust;
                }
                catch { Toast.MakeText(this, CSDL.Language("M00019") + "...Customer...", ToastLength.Short).Show(); }
            }
            catch { Ms(CSDL.Language("M00019")); }

            btColor.SetBackgroundColor(Color.Red);
            btHandfeel.SetBackgroundColor(Color.Red);
            btOdorTest.SetBackgroundColor(Color.Red);

            chkCycle.Checked = false;
            edDistance2Stripes.Enabled = false;
            edLengthCycleStandard.Enabled = false;
            edLengthCycleActual.Enabled = false;
            edCycleNumber.Enabled = false;
            edCycleHori.Enabled = false;
            edCycleVer.Enabled = false;

            string str = "select * from DtradeProduction.dbo.InlineFBDefect";
            try
            {
                DataTable dt = CSDL.kn.Doc(str).Tables[0];
                string saveLang = CSDL.pre.GetString("Lang", "").ToString();
                if (saveLang != "EN")
                    dtDefect = dt.DefaultView.ToTable(true, "DefectCode", "DefectName");
                else
                    dtDefect = dt.DefaultView.ToTable(true, "DefectCode", "Desc1");
            }
            catch { Ms(CSDL.Language("M00019") + "\n...defect..."); }
        }
        private void ClearData()
        {
            isClearing = true;
            QrCode = "";
            tvInv.Text = "---";
            tvSup.Text = "---";
            tvPO.Text = "---";
            tvItem.Text = "---";
            tvColor.Text = "---";
            tvLot.Text = "---";
            tvRoll.Text = "---";
            tvNW.Text = "---";
            tvGW.Text = "---";
            tvWidth.Text = "---";
            edWB.Text = "";
            edWM.Text = "";
            edWE.Text = "";
            tvYard.Text = "---";
            tvGSM.Text = "---";
            textView33.Text = CSDL.Language("FB0051") + " : 0";
            textView34.Text = CSDL.Language("FB0048") + " : 0";
            edYard.Text = "";
            tvMoisture.Text = "---";
            edMoisture.Text = "";
            edDistance2Stripes.Text = "";
            edLengthCycleActual.Text = "";
            edLengthCycleStandard.Text = "";
            edCycleNumber.Text = "";
            edPallet.Text = "";
            edCycleHori.Text = "";
            edCycleVer.Text = "";
            edGSM.Text = "";
            edNote.Text = "";
            lvDefect.Adapter = null;
            dtAddDF.Rows.Clear();
            tvDefect.Text = "-Select defect-";
            chkCycle.Checked = false;
            chkAddNew.Checked = false;
            LinkImg = "";
            path = "";
            isClearing = false;
        }
        private async void LoadingQrCodeAsync(string roll)
        {
            string sCheck = "exec DtradeProduction.dbo.InlineFBGetData 0,'" + roll + "','','','','','','','',''";
            try
            {
                DataTable dtCheck = CSDL.kn.Doc(sCheck).Tables[0];
                if (dtCheck.Rows.Count > 0)
                {
                    bool ok = false;
                    if (dtCheck.Rows[0][1].ToString() == "")
                    {
                        string s = "exec DtradeProduction.dbo.InlineFBGetData 1,'" + roll + "','" + CSDL.UserName + "','" + CSDL.Fac + "','','','','','',''";
                        CSDL.kn.Doc(s);
                        if (CSDL.kn.ErrorMessage != "")
                        {
                            Ms(CSDL.kn.ErrorMessage);
                            ok = false;
                            ClearData();
                        }
                        else ok = true;
                    }
                    else ok = true;

                    if (ok == true)
                    {
                        string s = "exec DtradeProduction.dbo.InlineFBGetData 2,'" + roll + "','','','','','','','',''";
                        DataSet ds = CSDL.kn.Doc(s);
                        if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                        else
                        {
                            if (ds.Tables[0].Rows.Count > 0)
                            {
                                DataRow dr = ds.Tables[0].Rows[0];
                                if (ds.Tables[1].Rows.Count == 0)
                                {
                                    AlertDialog.Builder builder = new AlertDialog.Builder(this);
                                    builder.SetTitle(CSDL.Language("M00086"));
                                    builder.SetMessage(CSDL.Language("FB0110"));
                                    builder.SetPositiveButton(CSDL.Language("M00115"), delegate
                                    {
                                        string s = "exec DtradeProduction.dbo.InlineFBGetData 3,'" + roll + "','" + dr["NW"].ToString().Replace(",", ".") + "','" + CSDL.UserName + "','" + CSDL.Fac + "','" + dr["ItemMoisture"].ToString() + "','','','',''";
                                        CSDL.kn.Doc(s);
                                        if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                                        else
                                        {
                                            Ms(CSDL.Language("SEWEND67"));
                                            tvInv.Text = dr["InvoiceNo"].ToString();
                                            tvSup.Text = dr["SupCode"].ToString();
                                            tvPO.Text = dr["OrderNumber"].ToString();
                                            tvItem.Text = dr["RollItem"].ToString();
                                            tvLot.Text = dr["BatchNo"].ToString();
                                            tvColor.Text = dr["Color"].ToString();
                                            tvRoll.Text = dr["RollNo"].ToString();
                                            tvNW.Text = dr["NW"].ToString();
                                            tvGW.Text = dr["GW"].ToString();
                                            tvWidth.Text = dr["Width"].ToString();
                                            tvYard.Text = dr["ShipLength"].ToString();
                                            if (dr["ItemMoisture"].ToString() != "")
                                                tvMoisture.Text = dr["ItemMoisture"].ToString();
                                            if (dr["GSM"].ToString() != "")
                                                tvGSM.Text = dr["GSM"].ToString();
                                            if (dr["RollLocation"].ToString() != "")
                                                edPallet.Text = dr["RollLocation"].ToString();
                                            btColor.SetBackgroundColor(Color.Green);
                                            color = 1;
                                            btHandfeel.SetBackgroundColor(Color.Green);
                                            handfeel = 1;
                                            QrCode = roll;
                                        }
                                    });
                                    builder.SetNegativeButton(CSDL.Language("FB0024"), delegate { return; });
                                    Dialog dg = builder.Create();
                                    dg.SetCanceledOnTouchOutside(false);
                                    dg.Show();
                                }
                                else
                                {
                                    AlertDialog.Builder builder = new AlertDialog.Builder(this);
                                    builder.SetTitle(CSDL.Language("M00086"));
                                    builder.SetPositiveButton(CSDL.Language("FB0113"), delegate
                                    {
                                        QrCode = roll;
                                        DataRow drr = ds.Tables[1].Rows[0];

                                        tvInv.Text = dr["InvoiceNo"].ToString();
                                        tvSup.Text = dr["SupCode"].ToString();
                                        tvPO.Text = dr["OrderNumber"].ToString();
                                        tvItem.Text = dr["RollItem"].ToString();
                                        tvLot.Text = dr["BatchNo"].ToString();
                                        tvColor.Text = dr["Color"].ToString();
                                        tvRoll.Text = dr["RollNo"].ToString();
                                        tvNW.Text = dr["NW"].ToString();
                                        tvGW.Text = dr["GW"].ToString();
                                        tvWidth.Text = dr["Width"].ToString();
                                        tvYard.Text = dr["ShipLength"].ToString();
                                        if (dr["ItemMoisture"].ToString() != "")
                                            tvMoisture.Text = dr["ItemMoisture"].ToString();
                                        if (dr["GSM"].ToString() != "")
                                            tvGSM.Text = dr["GSM"].ToString();
                                        if (dr["RollLocation"].ToString() != "")
                                            edPallet.Text = dr["RollLocation"].ToString();

                                        if (drr["ColorApp"].ToString() == "0")
                                        {
                                            color = 0;
                                            btColor.SetBackgroundColor(Color.Red);
                                        }
                                        else
                                        {
                                            color = 1;
                                            btColor.SetBackgroundColor(Color.Green);
                                        }
                                        if (drr["Handfeel"].ToString() == "0")
                                        {
                                            handfeel = 0;
                                            btHandfeel.SetBackgroundColor(Color.Red);
                                        }
                                        else
                                        {
                                            handfeel = 1;
                                            btHandfeel.SetBackgroundColor(Color.Green);
                                        }

                                        if (drr["InsptWidthB"].ToString() != "")
                                            edWB.Text = drr["InsptWidthB"].ToString();
                                        if (drr["InsptWidthM"].ToString() != "")
                                            edWM.Text = drr["InsptWidthM"].ToString();
                                        if (drr["InsptWidthE"].ToString() != "")
                                            edWE.Text = drr["InsptWidthE"].ToString();
                                        if (drr["InsptLenght"].ToString() != "")
                                            edYard.Text = drr["InsptLenght"].ToString();
                                        if (drr["Actual_Measured_Moisture"].ToString() != "")
                                            edMoisture.Text = drr["Actual_Measured_Moisture"].ToString();
                                        if (drr["Distance_2stripes"].ToString() != "")
                                            edDistance2Stripes.Text = drr["Distance_2stripes"].ToString();
                                        if (drr["CicleHorizontal"].ToString() != "")
                                            edCycleHori.Text = drr["CicleHorizontal"].ToString();
                                        if (drr["CicleVertical"].ToString() != "")
                                            edCycleVer.Text = drr["CicleVertical"].ToString();
                                        if (drr["CycleStandard"].ToString() != "")
                                            edLengthCycleStandard.Text = drr["CycleStandard"].ToString();
                                        if (drr["CycleActual"].ToString() != "")
                                            edLengthCycleActual.Text = drr["CycleActual"].ToString();
                                        if (drr["CycleNumber"].ToString() != "")
                                            edCycleNumber.Text = drr["CycleNumber"].ToString();
                                        if (drr["GSM"].ToString() != "")
                                            edGSM.Text = drr["GSM"].ToString();
                                        edNote.Text = !string.IsNullOrEmpty(drr["Note"].ToString()) ? drr["Note"].ToString() : "";

                                        if (ds.Tables[2].Rows.Count > 0)
                                        {
                                            dtAddDF = ds.Tables[2];
                                            lvDefect.Adapter = new Adapter_Defect(dtAddDF);

                                            int point = 0;
                                            if (dtAddDF.Rows.Count > 0)
                                            {
                                                foreach (DataRow r in dtAddDF.Rows)
                                                {
                                                    point += int.Parse(r["QtyDefect"].ToString()) * int.Parse(r["DefectPoint"].ToString());
                                                }
                                                float avg = CalculatorPoint(point, float.Parse(tvYard.Text.Trim().Replace(",", ".")), float.Parse(tvWidth.Text.Trim().Replace(",", ".")));
                                                textView33.Text = CSDL.Language("FB0051") + " : " + point;
                                                textView34.Text = CSDL.Language("FB0048") + " : " + Math.Round(avg, 0).ToString();

                                                string status = "";
                                                if (avg <= 15)
                                                {
                                                    status = "P";
                                                    imgDF.SetImageResource(Resource.Drawable.pass);
                                                }
                                                else
                                                {
                                                    status = "F";
                                                    imgDF.SetImageResource(Resource.Drawable.fail);
                                                }
                                            }
                                            else
                                            {
                                                textView33.Text = CSDL.Language("FB0051") + " : 0";
                                                textView34.Text = CSDL.Language("FB0048") + " : 0";
                                                imgDF.SetImageResource(Resource.Drawable.background);
                                            }
                                        }
                                    });
                                    builder.SetNegativeButton(CSDL.Language("FB0112"), delegate
                                    {
                                        AlertDialog.Builder builder1 = new AlertDialog.Builder(this);
                                        builder1.SetTitle(CSDL.Language("M00086"));
                                        builder1.SetMessage(CSDL.Language("FB0114"));
                                        builder1.SetPositiveButton(CSDL.Language("SEWIN45"), delegate
                                        {
                                            string s = "exec DtradeProduction.dbo.InlineFBGetData 4,'" + roll + "','','','','','','','',''";
                                            CSDL.kn.Doc(s);
                                            if (CSDL.kn.ErrorMessage != "") Ms(CSDL.kn.ErrorMessage);
                                            else Ms(CSDL.Language("FB0036"));
                                        });
                                        builder1.SetNegativeButton(CSDL.Language("FB0024"), delegate { return; });
                                        builder1.Create().Show();
                                    });
                                    builder.SetNeutralButton(CSDL.Language("FB0111"), delegate { return; });
                                    Dialog dg = builder.Create();
                                    dg.SetCanceledOnTouchOutside(false);
                                    dg.Show();
                                }

                                if (!string.IsNullOrEmpty(CSDL.UrlAPICall_ListDF))
                                {
                                    //await callAIAsync(dr);
                                    if (!string.IsNullOrEmpty(jsonListDF))
                                        showAIRedic();
                                    else Toast.MakeText(this, "AI no have data !", ToastLength.Short).Show();
                                }
                            }
                            else Ms(CSDL.Language("M00016"));
                        }
                    }
                    else Ms(CSDL.Language("M00019"));
                }
                else Ms(CSDL.Language("M00016"));
            }
            catch { Ms(CSDL.Language("DECO59") + "\n...Check Roll Exists..."); ClearData(); QrCode = ""; }
        }
        private void Ms(string ms)
        {
            Toast.MakeText(this, ms, ToastLength.Short).Show();
        }
        private float CalculatorPoint(int point = 0, float yard = 0, float width = 0)
        {
            float avg = 0;
            try
            {
                if (textView1.Text == "Adidas")
                {
                    avg = (point * 100) / yard;
                }
                else
                {
                    avg = ((point * 3600) / yard) / width;
                }
            }
            catch { }

            return avg;
        }
        protected override void OnResume()
        {
            base.OnResume();
        }
        //string jsonListDF = "";
        //string jsonListDF = @"{
        //    'status': 'success',
        //    'defect': {
        //        'DF009': 0.5407,
        //        'DF011': 0.3776,
        //        'DF056': 0.05,
        //        'DF012': 0.0125,
        //        'DF013': 0.0125,
        //        'DF023': 0.0067
        //    },
        //    'features': {
        //        'SupplierName': 'y.r.c',
        //        'LengthOfRollInvoice': 64.0,
        //        'IndentityQrCodeOfRoll': '12345678',
        //        'ColorName': '852A BLACK -Y3',
        //        'Description': 'Plain weave 77%POLYAMIDE(100%RECYCLED)/23%ELASTANE Solid',
        //        'FabricPrint': 'others',
        //        'FabricStructure': 'plain weave',
        //        'FabricType': 'spandix',
        //        'ColorTone': 'blacks'
        //    },
        //    'timestamp': '2024-10-07T05:11:05.046671+00:00'
        //    }";
        string jsonListDF = @"{
            ""status"": ""success"",
            ""defects"": {
                ""DF009"": 0.8947,
                ""DF011"": 0.0408,
                ""DF023"": 0.0353,
                ""DF013"": 0.025,
                ""DF005"": 0.0042
            },
            ""features"": {
                ""SupplierName"": ""FAR EASTERN"",
                ""LengthOfRollInvoice"": 59.0,
                ""IndentityQrCodeOfRoll"": ""56f44b0d46d74ffbbf5d438a1dc72566"",
                ""ColorName"": ""001A WHITE"",
                ""Description"": ""Interlock 85%REC.PES/15% EL Solid 220G/SQM AEROREADY;KNITTED"",
                ""FabricPrint"": ""aeroready"",
                ""FabricStructure"": ""interlock"",
                ""FabricType"": ""spandix"",
                ""ColorTone"": ""whites""
            },
            ""timestamp"": ""2024-12-12T07:13:39.741886+00:00""
        }";
        //string jsonPF = "";
        string jsonPF = @"{
                ""status"": ""success"",
                ""prediction"": 1,
                ""confidance"": {
                    ""0"": 0.0153,
                    ""1"": 0.9847
                },
                ""features"": {
                    ""SupplierName"": ""y.r.c"",
                    ""LengthOfRollInvoice"": 64.0,
                    ""IndentityQrCodeOfRoll"": ""12345678"",
                    ""ColorName"": ""852A BLACK -Y3"",
                    ""Description"": ""Plain weave 77%POLYAMIDE(100%RECYCLED)/23%ELASTANE Solid"",
                    ""FabricPrint"": ""others"",
                    ""FabricStructure"": ""plain weave"",
                    ""FabricType"": ""spandix"",
                    ""ColorTone"": ""blacks""
                },
                ""timestamp"": ""2024-10-07T04:56:16.203730+00:00""
            }";
        private async Task callAIAsync(DataRow dr)
        {
            var requestBody = new
            {
                SupplierName = dr["SupCode"],
                LengthOfRollInvoice = dr["ShipLength"],
                IndentityQrCodeOfRoll = dr["QrCode"],
                ColorName = dr["Color"],
                Description = dr["Descript"]
            };

            // Chuy?n d?i sang JSON
            string jsonBody = JsonConvert.SerializeObject(requestBody);

            // T?o HttpClient v g?i request
            using (HttpClient client = new HttpClient())
            {
                try
                {
                    var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                    HttpResponseMessage response = await client.PostAsync(CSDL.UrlAPICall_ListDF, content);

                    // Ki?m tra k?t qu?
                    if (response.IsSuccessStatusCode)
                    {
                        jsonListDF = await response.Content.ReadAsStringAsync();
                        Console.WriteLine("Response: " + jsonListDF);
                    }
                    else
                    {
                        Console.WriteLine($"Error: {response.StatusCode} - {response.ReasonPhrase}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Exception occurred: " + ex.Message);
                    Toast.MakeText(this, "Exception occurred: " + ex.Message, ToastLength.Long).Show();
                    string ms = ex.Message;
                }
            }

            using (HttpClient client_ = new HttpClient())
            {
                try
                {
                    var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");
                    HttpResponseMessage response_ = await client_.PostAsync(CSDL.UrlAPICall_PF, content);

                    // Ki?m tra k?t qu?
                    if (response_.IsSuccessStatusCode)
                    {
                        jsonPF = await response_.Content.ReadAsStringAsync();
                        Console.WriteLine("Response: " + jsonPF);
                    }
                    else
                    {
                        Console.WriteLine($"Error: {response_.StatusCode} - {response_.ReasonPhrase}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Exception occurred: " + ex.Message);
                }
            }
        }

        private void showAIRedic()
        {
            Root rootObject = JsonConvert.DeserializeObject<Root>(jsonListDF);

            DataTable dtDefect_ = new DataTable();
            dtDefect_.Columns.Add("DefectCode");
            dtDefect_.Columns.Add("DefectName");
            dtDefect_.Columns.Add("DefectPer");
            if (rootObject.Defect != null)
            {
                foreach (var defect in rootObject.Defect)
                {
                    DataRow[] r = dtDefect.Select($"DefectCode = '{defect.Key}'");
                    if (r.Length > 0)
                    {
                        DataRow dr = dtDefect_.NewRow();
                        dr["DefectCode"] = r[0]["DefectCode"];
                        if (saveLang != "EN")
                            dr["DefectName"] = r[0]["DefectName"];
                        else dr["DefectName"] = r[0]["Desc1"];
                        dr["DefectPer"] = defect.Value * 100;
                        dtDefect_.Rows.Add(dr);
                    }
                }
            }

            Root_ rootOnject_ = JsonConvert.DeserializeObject<Root_>(jsonPF);
            DataTable dtPF = new DataTable();
            dtPF.Columns.Add("Pass");
            dtPF.Columns.Add("Fail");

            DataRow dr_ = dtPF.NewRow();
            dr_["Pass"] = rootOnject_.Confidance.One;
            dr_["Fail"] = rootOnject_.Confidance.Zero;
            dtPF.Rows.Add(dr_);

            AlertDialog.Builder builder = new AlertDialog.Builder(this);
            builder.SetTitle("Predictions from AI");
            LinearLayout ln = new LinearLayout(this) { Orientation = Orientation.Vertical };
            ListView listViewDF = new ListView(this) { LayoutParameters = new ViewGroup.LayoutParams(ViewGroup.LayoutParams.WrapContent, CSDL.rq.eHeight(200)) };
            listViewDF.Adapter = new A1ATeam.ListViewAdapterWithNoLayout(dtDefect_, new List<int> { 100, 200, 100 }, true, true, false, false) { TextSize = CSDL.rq.eTextSize(14f) };
            TextView tv1 = new TextView(this) { Text = "List Defect (%)" };
            ln.AddView(tv1);
            ln.AddView(listViewDF);

            ListView listViewPF = new ListView(this) { LayoutParameters = new ViewGroup.LayoutParams(ViewGroup.LayoutParams.WrapContent, CSDL.rq.eHeight(200)) };
            listViewPF.Adapter = new A1ATeam.ListViewAdapterWithNoLayout(dtPF, new List<int> { 100, 100 }, true, true, false, false) { TextSize = CSDL.rq.eTextSize(14f) };
            TextView tv2 = new TextView(this) { Text = "PassFail (%)" };
            ln.AddView(tv2);
            ln.AddView(listViewPF);

            builder.SetView(ln);
            builder.Create().Show();
        }
    }
}