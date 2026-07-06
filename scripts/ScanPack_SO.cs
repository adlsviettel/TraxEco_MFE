using CSDL;
using FGsScan.Properties;
using Microsoft.VisualBasic;
using System;
using System.Collections.Generic;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Runtime.Remoting.Messaging;
using System.Windows.Forms;
using System.Xml;


namespace FGsScan
{
    public partial class ScanPack_SO : Form
    {
        MainScreen mc;
        int ReScan = 0, prvLength = 0;
        string strPONo = "", mPrevOrdNo = "", CTNBarCode = "";
        DataSet dsPOPackInfo = new DataSet();
        DataTable dtUPCScan = new DataTable();
        List<string> ltUPC = new List<string>();
        List<CustomListItems> ltCTN = new List<CustomListItems>();

        TimeSpan tmelapsed = (DateTime.Now - DateTime.Now);
        private static DateTime lastdatasent = new DateTime(0);

        public ScanPack_SO(MainScreen m)
        {
            InitializeComponent();
            mc = m;
            tmCodeReaderTxtChgSnP.Enabled = true;
            tmCodeReaderTxtChgSnP.Interval = 5;
            tmCodeReaderTxtChgSnP.Tick += TmCodeReaderTxtChgSnP_Tick;

            button4.Text = "SAVE SCANS";
            button4.BackColor = Color.LimeGreen;
            button4.Font = new Font(button4.Font.FontFamily, 9, FontStyle.Bold);
            button4.Size = new Size(110, 30);
            button4.Location = new Point(370, 258);
            button4.Anchor = AnchorStyles.Top | AnchorStyles.Left;
            button4.BringToFront();
            button4.Visible = true;

            tbxORDERorLOT.Text = Settings.Default.oderORlot;

            List<string> mListFac = new List<string>();
            foreach (DataRow dr in CSDL.dsLang.Tables[4].Rows)
            {
                if (!mListFac.Contains(dr[0].ToString()))
                {
                    mListFac.Add(dr[0].ToString());
                    cbFac.Items.Add(dr[0].ToString());
                }
            }
            if (mListFac.Contains(Settings.Default.SetFac)) cbFac.SelectedItem = Settings.Default.SetFac;
            else
            {
                //MessageBox.Show("Select Factory");
                if (mListFac.Count > 0) cbFac.SelectedItem = cbFac.Items[0];
            }

            checkBox1.Checked = false;

        }
        private void tbCodeReaderSnP_TextChanged(object sender, EventArgs e)
        {
            if (!tmCodeReaderTxtChgSnP.Enabled) tmCodeReaderTxtChgSnP.Start();
            tmelapsed = (DateTime.Now - DateTime.Now);
            lastdatasent = DateTime.Now;
        }
        private void TmCodeReaderTxtChgSnP_Tick(object sender, EventArgs e)
        {
            tmelapsed = (DateTime.Now - lastdatasent);

            if (tbCodeReaderSnP.Text.Contains('\n') || (tmelapsed.TotalMilliseconds > Settings.Default.ReaderInterval * 20 && tbCodeReaderSnP.Text.Trim() != ""))
            {
                CodeReaderIdentifier();
            }
        }

                private void CodeReaderIdentifier()
        {
            tmelapsed = (DateTime.Now - DateTime.Now);
            tmCodeReaderTxtChgSnP.Stop();

            System.Media.SoundPlayer player, beep;
            string mUPC = tbCodeReaderSnP.Text.Trim();
            if (ltUPC.Contains(mUPC))
            {
                int UPCRwIndex = -1, dem = 0;
                foreach (DataRow dr in dtUPCScan.Rows)
                {
                    if (dr["UPC_Code"].ToString().Equals(mUPC))
                    {
                        int scanQty = string.IsNullOrEmpty(dr["ScanQty"].ToString()) ? 0 : int.Parse(dr["ScanQty"].ToString());
                        int packedQty = string.IsNullOrEmpty(dr["PackedQty"].ToString()) ? 0 : int.Parse(dr["PackedQty"].ToString());
                        if (scanQty < packedQty) { UPCRwIndex = dem; break; }
                        else dem++;
                    }
                    else dem++;
                }

                if (UPCRwIndex > -1)
                {
                    int ScnQty = string.IsNullOrEmpty(dtUPCScan.Rows[UPCRwIndex]["ScanQty"].ToString()) ? 0 : int.Parse(dtUPCScan.Rows[UPCRwIndex]["ScanQty"].ToString());
                    int ReqQty = string.IsNullOrEmpty(dtUPCScan.Rows[UPCRwIndex]["PackedQty"].ToString()) ? 0 : int.Parse(dtUPCScan.Rows[UPCRwIndex]["PackedQty"].ToString());

                    if (ScnQty < ReqQty)
                    {
                        dtUPCScan.Rows[UPCRwIndex]["ScanQty"] = ScnQty + 1;
                        int newScan = string.IsNullOrEmpty(dtUPCScan.Rows[UPCRwIndex]["NewScanQty"].ToString()) ? 0 : int.Parse(dtUPCScan.Rows[UPCRwIndex]["NewScanQty"].ToString());
                        dtUPCScan.Rows[UPCRwIndex]["NewScanQty"] = newScan + 1;
                        dtUPCScan.AcceptChanges();
                        dgvCTNDetail.DataSource = dtUPCScan;

                        btInQtyCTN.Text = (int.Parse(btInQtyCTN.Text) + 1).ToString();
                        beep = new System.Media.SoundPlayer(Properties.Resources.ShBeep);
                        beep.Play();
                    }
                    else
                    {
                        MessageBox.Show(this, "OVER QUANTITY", "WARNING", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        if (File.Exists(Settings.Default.FileAddress + "OHNO.WAV")) player = new System.Media.SoundPlayer(Settings.Default.FileAddress + "OHNO.WAV");
                        else player = new System.Media.SoundPlayer(Properties.Resources.OHNO);
                        player.Play();
                    }
                }
                else
                {
                    MessageBox.Show(this, "OVER QUANTITY", "WARNING", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    if (File.Exists(Settings.Default.FileAddress + "OHNO.WAV")) player = new System.Media.SoundPlayer(Settings.Default.FileAddress + "OHNO.WAV");
                    else player = new System.Media.SoundPlayer(Properties.Resources.OHNO);
                    player.Play();
                }
                tbCodeReaderSnP.Text = "";
            }
            else
            {
                if (File.Exists(Settings.Default.FileAddress + "OHNO.WAV")) player = new System.Media.SoundPlayer(Settings.Default.FileAddress + "OHNO.WAV");
                else player = new System.Media.SoundPlayer(Properties.Resources.OHNO);
                player.Play();
                tbCodeReaderSnP.Text = "";
            }
        }
        private bool UpdatePackedCTNServer(DataTable dt)
        {
            bool updatecheker = false;
            if (dt.Rows.Count > 0 && tbPONo.Text.Trim().Length > 0 && tbOrdNo.Text.Trim().Length > 0 && tbCTNCode.Text.Trim().Length > 0)
            {
                int i = 0;
                updatecheker = true;
                string str = (mCSDL.kn.Doc("select top 1 RecNo from InlineFGsWHCancelOrd where LotRefNo in (select top 1 PlanRefNo from InlineFGsWHPkList where CTNSeriNo = '" + tbCTNCode.Text + "' )").Tables[0].Rows.Count > 0) ? "'1'" : "null";

                StringWriter stringWriter = new StringWriter();
                XmlWriterSettings writerSettings = new XmlWriterSettings() { Indent = true };
                using (XmlWriter xmlWriter = XmlWriter.Create(stringWriter, writerSettings))
                {
                    xmlWriter.WriteStartDocument();
                    xmlWriter.WriteStartElement("root");
                    foreach (DataRow dr in dt.Rows)
                    {
                        xmlWriter.WriteStartElement("row");
                        xmlWriter.WriteElementString("CTNBarCode", dr["NewBarCode"].ToString());
                        xmlWriter.WriteElementString("UPC_Code", dr["UPC_Code"].ToString());
                        xmlWriter.WriteElementString("PO", dr["LotRef"].ToString());
                        xmlWriter.WriteElementString("PackedQty", dr["PackedQty"].ToString());
                        xmlWriter.WriteEndElement();
                    }
                    xmlWriter.WriteEndElement();
                    xmlWriter.WriteEndDocument();
                }

                string sql = $"EXEC dbo.InlineFGsWHScanUpdate_Test @pXML = N'{stringWriter.ToString()}'" +
                    $",@CTNBarcode = '{tbCTNCode.Text}'" +
                    $",@LineNo = '{cbLine.Text}'" +
                    $",@UserName ='{CSDL.UserName}'" +
                    $",@Factory = '{CSDL.FacID}';";
                mCSDL.kn.Doc(sql);
                if (mCSDL.kn.ErrorMessage != "")
                {
                    MessageBox.Show(mCSDL.kn.ErrorMessage);
                    updatecheker = false;
                }

                //foreach (DataRow dr in dt.Rows)
                //{
                //    int PQty = string.IsNullOrEmpty(dr["ScanQty"].ToString()) ? 0 : int.Parse(dr["ScanQty"].ToString());
                //    if (dr["UPC_Code"].ToString() != "" && PQty > 0)
                //    {
                //        i++;
                //List<string> UploadFGsWHCTNScan = new List<string>();
                //UploadFGsWHCTNScan.AddRange(new string[]
                //{
                //    "@CTNBarcode=" + tbCTNCode.Text,
                //    "@GarmtBarcode=" + dr["UPC_Code"].ToString(),
                //    "@PONo=" + tbPONo.Text,
                //    "@ScanedQty=" + dr["ScanQty"].ToString(),
                //    "@POBarcode=" + "NULL",
                //    "@CTNNo=" + btCTNNo.Text,
                //    "@PLQty=" + btReqQtyCTN.Text,
                //    "@InQty=" + btInQtyCTN.Text,
                //    "@LineNo=" + cbLine.Text,
                //    "@UserName=" + CSDL.UserName,
                //    "@Factory=" + CSDL.FacID,
                //    "@RecordTime=" + DateTime.Now.ToString("yyyyMMdd HH:mm:ss"),
                //    "@Count=" + i.ToString(),
                //    "@RecNo=" + ReScan,
                //    "@CTNSeriNo=" + tbCTNCode.Text,
                //    "@ShipStatus=" + str
                //    //,"@JobNo=" + dr["JobNo"].ToString()
                //});
                //mCSDL.kn.Proc("InlineFGsWHScanUpdate", UploadFGsWHCTNScan);

                //string sql = $"EXEC dbo.InlineFGsWHScanUpdate_Test " +
                //    $"@CTNBarcode = '{tbCTNCode.Text}'" +
                //    $",@GarmtBarcode = '{dr["UPC_Code"].ToString()}'" +
                //    $",@PONo = '{tbPONo.Text}'" +
                //    $",@ScanedQty = '{dr["ScanQty"].ToString()}'" +
                //    $",@POBarcode = 'NULL'" +
                //    $",@CTNNo = '{btCTNNo.Text}'" +
                //    $",@PLQty = '{btReqQtyCTN.Text}'" +
                //    $",@InQty = '{btInQtyCTN.Text}'" +
                //    $",@LineNo = '{cbLine.Text}'" +
                //    $",@UserName = '{CSDL.UserName}'" +
                //    $",@Factory = '{CSDL.FacID}'" +
                //    $",@RecordTime = '{DateTime.Now.ToString("yyyyMMdd HH:mm:ss")}'" +
                //    $",@Count = '{i.ToString()}'" +
                //    $",@RecNo = '{ReScan}'" +
                //    $",@CTNSeriNo = '{tbCTNCode.Text}'" +
                //    $",@ShipStatus = '{str}'";
                //mCSDL.kn.Doc(sql);
                //if (mCSDL.kn.ErrorMessage != "")
                //{
                //    MessageBox.Show(mCSDL.kn.ErrorMessage);
                //    updatecheker = false;
                //    break;
                //}
                //}
                //}
            }
            else
            {
                MessageBox.Show(CSDL.Language("M00019") + " :" + "\n" + CSDL.Language("M00045") + "\n" + CSDL.Language("M00229")); //error occur : incomplete information
            }
            return updatecheker;
        }


        private void cbFac_SelectedIndexChanged(object sender, EventArgs e)
        {
            cbLine.Items.Clear();
            DataTable dt = mCSDL.kn.Doc("select distinct FacLine from cpdtlsdays where left(FacLine,2)='" + cbFac.Text + "'").Tables[0];
            if (dt.Rows.Count > 0)
            {
                foreach (DataRow dr in dt.Rows) cbLine.Items.Add(dr[0].ToString());
                cbLine.SelectedItem = cbLine.Items[0];
            }
            Settings.Default.SetFac = cbFac.Text;
            Settings.Default.Save();

        }
                private void button4_Click(object sender, EventArgs e)
        {
            if(dtUPCScan == null || dtUPCScan.Rows.Count == 0) return;
            
            bool hasNewScans = false;
            int totalNewScan = 0;
            foreach(DataRow dr in dtUPCScan.Rows) {
                if(dr["NewScanQty"] != DBNull.Value && Convert.ToInt32(dr["NewScanQty"]) > 0) {
                    hasNewScans = true;
                    totalNewScan += Convert.ToInt32(dr["NewScanQty"]);
                }
            }
            if(!hasNewScans) {
                MessageBox.Show("Không có dữ liệu Scan mới để lưu!", "Info");
                return;
            }

            string dummyCTN = "SO_" + DateTime.Now.ToString("yyMMddHHmmssfff");
            
            string sqlBatch = $"INSERT INTO InlineFGsWHCTNMaster (PONo, CTNBarCode, CTNNo, PLQty, PackedQty, CreatedBy, SysCreateDate, Factory, CTNSeriNo, FacLine) VALUES ('{tbPONo.Text}', '{dummyCTN}', '9999', {totalNewScan}, {totalNewScan}, '{CSDL.UserName}', GETDATE(), '{CSDL.FacID}', 'SO_{tbOrdNo.Text}', '{cbLine.Text}');\r\n";

            foreach (DataRow dr in dtUPCScan.Rows)
            {
                int newScanQty = (dr["NewScanQty"] != DBNull.Value) ? Convert.ToInt32(dr["NewScanQty"]) : 0;
                if (newScanQty > 0)
                {
                    sqlBatch += $"INSERT INTO dbo.InlineFGsWHScan (CTNBarCode, GarmentBarcode, PONo, ScanedQty, CreatedBy, SysCreateDate, Factory) " +
                                     $"VALUES ('{dummyCTN}', '{dr["UPC_Code"]}', '{tbPONo.Text}', {newScanQty}, '{CSDL.UserName}', GETDATE(), '{CSDL.FacID}');\r\n";
                }
            }

            mCSDL.kn.Doc(sqlBatch);
            if (!string.IsNullOrEmpty(mCSDL.kn.ErrorMessage)) { MessageBox.Show("SQL Save Error: " + mCSDL.kn.ErrorMessage); return; }

            MessageBox.Show("Lưu lịch sử Scan thành công!", "Info", MessageBoxButtons.OK, MessageBoxIcon.Information);
            tbCodeReaderSnP.Text = "";
            foreach(DataRow dr in dtUPCScan.Rows) { dr["NewScanQty"] = 0; }
            dtUPCScan.AcceptChanges();
            dgvCTNDetail.DataSource = dtUPCScan;
            dgvCTNDetail.Refresh();
            tbCodeReaderSnP.Focus();
        }
        private void SelectPickedCTN()
        {
            btCTNNo.Text = "";
            listView1.Items.Clear();
            ltCTN.Clear();

            foreach (DataGridViewRow dgrR in dgvPOSummary.SelectedRows)
            {
                ltCTN.Add(new CustomListItems { str1 = dgrR.Cells[0].Value.ToString(), str2 = dgrR.Cells[2].Value.ToString() });
                listView1.Items.Add(new ListViewItem(dgrR.Cells[2].Value.ToString()));
            }
            newCTNScan();

        }

        private void newCTNScan()
        {
            if (listView1.Items.Count > 0)
            {
                btCTNNo.Text = ""; //cannot remove this, same carton no -> will trig change activity
                btCTNNo.Text = listView1.Items[0].Text; //call button5_TextChanged(object sender, EventArgs e)
                //btReqQtyCTN.Text = dtUPCScan.Rows[0]["TtlQty"].ToString();
                int qtySum = 0, qtyTotal = 0;
                foreach (DataRow dr in dtUPCScan.Rows)
                {
                    qtySum += int.Parse(string.IsNullOrEmpty(dr["ScanQty"].ToString()) ? "0" : dr["ScanQty"].ToString());
                    qtyTotal += int.Parse(string.IsNullOrEmpty(dr["PackedQty"].ToString()) ? "0" : dr["PackedQty"].ToString());
                }
                btInQtyCTN.Text = qtySum.ToString();
                btReqQtyCTN.Text = qtyTotal.ToString();//dtUPCScan.Rows[0]["TtlQty"].ToString();
                tbOrdNo.Text = dtUPCScan.Rows[0][0].ToString();
            }
            else
            {
                dgvCTNDetail.DataSource = null;
                btCTNNo.Text = "";
                btReqQtyCTN.Text = "0";
                btInQtyCTN.Text = "0";
            }
            tbCodeReaderSnP.Focus();
        }
                private void button5_TextChanged(object sender, EventArgs e)
        {
        }
        private void label2_Click(object sender, EventArgs e)
        {

        }
        private void button3_Click(object sender, EventArgs e)
        {
            DsPOPackInfoRefr("OrderNo", tbxORDERorLOT.Text);
            Settings.Default.oderORlot = tbxORDERorLOT.Text;
            Settings.Default.Save();
        }
        private void button1_Click(object sender, EventArgs e)
        {
            DsPOPackInfoRefr("LotRef", tbxORDERorLOT.Text);
            Settings.Default.oderORlot = tbxORDERorLOT.Text;
            Settings.Default.Save();
        }
        private void button5_Click(object sender, EventArgs e)
        {
            DsPOPackInfoRefr("ExtDesc2", tbxORDERorLOT.Text);
            Settings.Default.oderORlot = tbxORDERorLOT.Text;
            Settings.Default.Save();
        }
        public DataSet DsPOPackInfoRefr(string SQLColumn, string SQLValue)
        {
            DataSet dsPOPackInfoTemp = new DataSet();
            try
            {
                dgvPOSummary.DataSource = null;
                string localIP;
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    localIP = endPoint.Address.ToString();
                }

                //List<string> proc = new List<string> { "@Column=" + SQLColumn
                //                                        , "@Value= " + SQLValue
                //                                        , "@CreatedBy=" + localIP + "/" + Environment.UserName
                //                                        , "@Factory=" + Settings.Default.SetLogFac };

                //string mstr = "exec InlineFGsWHPkListSnP '" + SQLColumn + "', '" + SQLValue + "','" + localIP + "/" + Environment.UserName + "','" + Settings.Default.SetLogFac + "'"; //,'" + int.Parse(Settings.Default.DelayTime.ToString()) + "'";
                string mstr = $"EXEC dbo.InlineFGsWHPkListSnP_Test	@NewBarCode = '{CTNBarCode.Trim()}'" +
                            $", @CreatedBy = '{CSDL.UserName}'" +
                            $", @Factory = '{CSDL.FacID}'; ";
                dsPOPackInfoTemp = CSDL.kn.Doc(mstr);

                //MessageBox.Show(dsPOPackInfoTemp.Tables[0].Rows.Count.ToString() + " " + dsPOPackInfoTemp.Tables[1].Rows.Count + " " + SQLColumn + " " + SQLValue);

                dsPOPackInfo = dsPOPackInfoTemp;

                if (checkBox1.Checked)
                {
                    if (dsPOPackInfoTemp.Tables[1].Rows.Count == 1)
                    {
                        strPONo = dsPOPackInfoTemp.Tables[1].Rows[0][0].ToString();

                        tbPONo.Text = strPONo;
                        dgvPOSummary.DataSource = GetInversedDataTable(dsPOPackInfoTemp.Tables[0], "Size", new List<string> { "JobNo", "Color", "CTNNo", "TtlQty", "ScanQty" }, "PackedQty", "", true, new List<string> { "ScanQty" }); //"TtlQty", "ScanQty"

                        foreach (DataGridViewRow row in dgvPOSummary.Rows)
                        {
                            if (!string.IsNullOrEmpty(row.Cells["ScanQty"].Value.ToString()))//(Convert.ToInt32(row.Cells[7].Value) < Convert.ToInt32(row.Cells[10].Value))
                            {
                                row.DefaultCellStyle.BackColor = Color.Green;
                            }
                        }
                        //Scan2FindCTNNo();
                    }
                    else MessageBox.Show(CSDL.Language("M00043") + dsPOPackInfoTemp.Tables[0].Rows.Count.ToString() + dsPOPackInfoTemp.Tables[1].Rows.Count.ToString()); //nothing to select
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(CSDL.Language("M00043") + " TRY-CATCH | Server connection error" + "\n" + ex.Message);
            }

            return dsPOPackInfoTemp;
        }
        public static DataTable GetInversedDataTable(DataTable table, string columnX, List<string> columnY, string columnZ, string nullValue, bool sumValues, List<string> IgnoreColumn)
        {
            //Create a DataTable to Return
            DataTable returnTable = new DataTable();

            if (columnX == "") columnX = table.Columns[0].ColumnName;

            //Add columns that is rows header in pivot table
            //returnTable = table.DefaultView.ToTable(true, columnY.ToArray());
            foreach (string str in columnY) returnTable.Columns.Add(str);

            //Read all DISTINCT values from columnX : Column is formed from ROWS => rows data to columns
            List<string> columnXValues = new List<string>();
            foreach (DataRow dr in table.Rows)
            {
                string columnXTemp = dr[columnX].ToString();
                if (!columnXValues.Contains(columnXTemp))
                {
                    columnXValues.Add(columnXTemp);
                    returnTable.Columns.Add(columnXTemp);
                }
            }

            //Verify if Y and Z Axis columns are provided
            if (columnY.Count != 0 && columnZ != "")
            {
                //Read DISTINCT Values for Y Axis Column
                List<string> columnYValues = new List<string>();

                foreach (DataRow dr in table.Rows)
                {
                    string strCompare = "";
                    foreach (string str in columnY)
                    {
                        //if(!IgnoreColumn.Contains(str)) strCompare += string.IsNullOrEmpty(dr[str].ToString()) ? " ?" : (dr[str].ToString() + "?");
                        strCompare += string.IsNullOrEmpty(dr[str].ToString()) ? " ?" : (dr[str].ToString() + "?");
                    }
                    if (!columnYValues.Contains(strCompare)) columnYValues.Add(strCompare);
                }

                //Loop all Column Y Distinct Value
                foreach (string columnYValue in columnYValues)
                {
                    //Creates a new Row
                    DataRow drReturn = returnTable.NewRow();
                    string[] YValue = columnYValue.Split('?');
                    for (int i = 0; i < YValue.Length; i++) drReturn[i] = YValue[i].ToString().Trim();

                    string strFilter = "";
                    for (int i = 0; i < columnY.Count; i++) if (!IgnoreColumn.Contains(columnY[i])) strFilter += columnY[i].ToString() + "='" + YValue[i].ToString() + (i == (columnY.Count - 1 - IgnoreColumn.Count()) ? "'" : "' and ");

                    //foreach column Y value, The rows are selected distincted
                    DataRow[] rows = table.Select(strFilter);

                    //Read each row to fill the DataTable
                    foreach (DataRow dr in rows)
                    {
                        string rowColumnTitle = dr[columnX].ToString();

                        //Read each column to fill the DataTable
                        foreach (DataColumn dc in returnTable.Columns)
                        {
                            if (dc.ColumnName == rowColumnTitle)
                            {
                                //If Sum of Values is True it try to perform a Sum
                                //If sum is not possible due to value types, the value displayed is the last one read
                                if (sumValues)
                                {
                                    try
                                    {
                                        drReturn[rowColumnTitle] =
                                             Convert.ToDecimal(drReturn[rowColumnTitle]) +
                                             Convert.ToDecimal(dr[columnZ]);
                                    }
                                    catch
                                    {
                                        drReturn[rowColumnTitle] = dr[columnZ];
                                    }
                                }
                                else
                                {
                                    drReturn[rowColumnTitle] = dr[columnZ];
                                }
                            }
                        }
                    }
                    returnTable.Rows.Add(drReturn);
                }
            }
            else
            {
                throw new Exception("The columns to perform inversion are not provided");
            }

            //returnTable.Columns["ScanQty"].SetOrdinal(returnTable.Columns.Count-1);

            //if a nullValue is provided, fill the datable with it
            if (nullValue != "")
            {
                foreach (DataRow dr in returnTable.Rows)
                {
                    foreach (DataColumn dc in returnTable.Columns)
                    {
                        if (dr[dc.ColumnName].ToString() == "") dr[dc.ColumnName] = nullValue;
                    }
                }
            }

            return returnTable;
        }

        public DataSet getDifferentRecords(DataTable FirstDataTable, DataTable SecondDataTable)
        {
            DataSet ResultDataSet = new DataSet("DataSetResult");

            //Create Empty Table   
            DataTable ResultDataTable1 = new DataTable("Result1STnoin2ND");
            DataTable ResultDataTable2 = new DataTable("Result2NDnoin1ST");

            //use a Dataset to make use of a DataRelation object   
            using (DataSet ds = new DataSet())
            {
                //Add tables   
                ds.Tables.AddRange(new DataTable[] { FirstDataTable.Copy(), SecondDataTable.Copy() });

                //Get Columns for DataRelation   
                DataColumn[] firstColumns = new DataColumn[ds.Tables[0].Columns.Count];
                for (int i = 0; i < firstColumns.Length; i++) firstColumns[i] = ds.Tables[0].Columns[i];

                DataColumn[] secondColumns = new DataColumn[ds.Tables[1].Columns.Count];
                for (int i = 0; i < secondColumns.Length; i++) secondColumns[i] = ds.Tables[1].Columns[i];

                //Create DataRelation   
                DataRelation r1 = new DataRelation(string.Empty, firstColumns, secondColumns, false);
                ds.Relations.Add(r1);

                DataRelation r2 = new DataRelation(string.Empty, secondColumns, firstColumns, false);
                ds.Relations.Add(r2);

                //Create columns for return table 1   
                for (int i = 0; i < FirstDataTable.Columns.Count; i++) ResultDataTable1.Columns.Add(FirstDataTable.Columns[i].ColumnName, FirstDataTable.Columns[i].DataType);

                //Create columns for return table 1   
                for (int i = 0; i < SecondDataTable.Columns.Count; i++) ResultDataTable2.Columns.Add(SecondDataTable.Columns[i].ColumnName, SecondDataTable.Columns[i].DataType);


                //If FirstDataTable Row not in SecondDataTable, Add to ResultDataTable.   
                ResultDataTable1.BeginLoadData();
                foreach (DataRow parentrow in ds.Tables[0].Rows)
                {
                    DataRow[] childrows = parentrow.GetChildRows(r1);
                    if (childrows == null || childrows.Length == 0) ResultDataTable1.LoadDataRow(parentrow.ItemArray, true);
                }
                ResultDataTable1.EndLoadData();

                //If SecondDataTable Row not in FirstDataTable, Add to ResultDataTable.   
                ResultDataTable2.BeginLoadData();
                foreach (DataRow parentrow in ds.Tables[1].Rows)
                {
                    DataRow[] childrows = parentrow.GetChildRows(r2);
                    if (childrows == null || childrows.Length == 0) ResultDataTable2.LoadDataRow(parentrow.ItemArray, true);
                }
                ResultDataTable2.EndLoadData();
            }
            ResultDataSet.Tables.Add(ResultDataTable1);
            ResultDataSet.Tables.Add(ResultDataTable2);
            return ResultDataSet;
        }

        private void ScanPack_FormClosed(object sender, FormClosedEventArgs e)
        {
            mc.Show();
        }
        private void dgvPOSummary_Paint(object sender, PaintEventArgs e)
        {
            if (dgvPOSummary.Columns.Count > 2) dgvPOSummary.Columns[2].Frozen = true;
        }

        private void dataGridView2_Paint(object sender, PaintEventArgs e)
        {
            if (dgvCTNDetail.Columns.Count > 5)
            {
                dgvCTNDetail.Columns["CTNNo"].DefaultCellStyle.BackColor = Color.FromArgb(255, 255, 128);
                dgvCTNDetail.Columns["CTNNo"].DefaultCellStyle.ForeColor = Color.Red;
                dgvCTNDetail.Columns["Size"].DefaultCellStyle.BackColor = Color.FromArgb(255, 255, 128);
                dgvCTNDetail.Columns["Size"].DefaultCellStyle.ForeColor = Color.Red;
                dgvCTNDetail.Columns["PackedQty"].DefaultCellStyle.BackColor = Color.FromArgb(192, 255, 192);
                dgvCTNDetail.Columns["PackedQty"].DefaultCellStyle.ForeColor = Color.Blue;
                    string strCompare = "";
                dgvCTNDetail.Columns["ScanQty"].DefaultCellStyle.ForeColor = Color.Blue;
            }
        }

                private void ScanPack_Load(object sender, EventArgs e)
        {
        }

        private void btInQtyCTN_Click(object sender, EventArgs e)
        {
        }

        private void btCTNNo_Click(object sender, EventArgs e)
        {
            string soBarcode = Microsoft.VisualBasic.Interaction.InputBox("Scan SO Number / UCC Barcode : ", "Input SO/UCC", "", -1, -1);
            if (!string.IsNullOrEmpty(soBarcode.Trim()))
            {
                LoadSO(soBarcode.Trim());
            }
        }

        private void LoadSO(string soBarcode)
        {
            try {
                string checkSql = $"SELECT TOP 1 * FROM InlineFGsWHPkList WHERE PONo = '{soBarcode}' OR PlanRefNo = '{soBarcode}'";
                DataSet dsCheck = mCSDL.kn.Doc(checkSql);
                if (dsCheck == null || dsCheck.Tables.Count == 0) {
                    MessageBox.Show("Error in checkSql: " + mCSDL.kn.ErrorMessage);
                    return;
                }
                if (dsCheck.Tables[0].Rows.Count == 0)
                {
                    string insertPkSql = $@"
                        INSERT INTO InlineFGsWHPkList (PlanRefNo, PONo, BuyerItem, ModelNo, CustSize, ManuSize, GPSSize, CTNNo, CTNSeriNo, PackedQty, SysCreateDate, CreatedBy, Factory, GrssW, NetW, CTNL, CTNW, CTNH)
                        SELECT s.LotRef, s.OrderNo, s.Style, s.Style, h.Sizx, h.Sizx, h.Sizx, 1, 'SO_' + s.OrderNo, h.Qty, GETDATE(), '{CSDL.UserName}', '{CSDL.FacID}', 0, 0, 0, 0, 0
                        FROM sahasm h
                        JOIN saoship s ON s.OrderNo = h.OrderNo AND s.ShipNo = h.ShipNo
                        WHERE s.OrderNo = '{soBarcode}' OR s.LotRef = '{soBarcode}'
                    ";
                    mCSDL.kn.Doc(insertPkSql);
                    if (!string.IsNullOrEmpty(mCSDL.kn.ErrorMessage)) { MessageBox.Show("SQL Init PkList Error: " + mCSDL.kn.ErrorMessage); return; }
                }

                string sql = $@"
                    SELECT 
                        s.OrderNo AS JobNo,
                        s.LotRef AS PONo,
                        h.Color,
                        h.Sizx AS Size,
                        u.UPC_Code,
                        ISNULL(h.Qty, 0) AS PackedQty,
                        ISNULL((SELECT SUM(sc.ScanedQty) FROM InlineFGsWHScan sc JOIN InlineFGsWHCTNMaster cm ON sc.CTNBarCode = cm.CTNBarCode WHERE sc.GarmentBarcode = u.UPC_Code AND sc.PONo = s.LotRef AND (sc.ReScan IS NULL OR sc.ReScan = '0') AND ISNULL(cm.ShipStatus, '') <> 'rescan' AND cm.Comment1 IS NULL AND (cm.ReScan IS NULL OR cm.ReScan = '0')), 0) AS ScanQty,
                        ISNULL(h.Qty, 0) AS TtlQty
                    FROM saoship s
                    JOIN sahasm h ON s.OrderNo = h.OrderNo AND s.ShipNo = h.ShipNo
                    JOIN Tx_SP_JobDet_UPC u ON h.OrderNo = u.JobNo AND h.ShipNo = u.JobDetId 
                        AND h.ColorID = u.ColorId AND h.SizeID = u.SizeId
                    WHERE s.OrderNo = '{soBarcode}' OR s.LotRef = '{soBarcode}'";

                DataSet dsMain = mCSDL.kn.Doc(sql);
                if (dsMain == null || dsMain.Tables.Count == 0) {
                    MessageBox.Show("Error in main SQL: " + mCSDL.kn.ErrorMessage);
                    return;
                }
                DataTable dt = dsMain.Tables[0];
                if (dt.Rows.Count > 0)
                {
                    strPONo = dt.Rows[0]["PONo"].ToString();
                    tbPONo.Text = strPONo;
                    tbOrdNo.Text = dt.Rows[0]["JobNo"].ToString();

                    dtUPCScan = dt.Copy();
                    dtUPCScan.Columns.Add("NewScanQty", typeof(int));
                    ltUPC.Clear();
                    foreach(DataRow dr in dtUPCScan.Rows) {
                        dr["NewScanQty"] = 0;
                        ltUPC.Add(dr["UPC_Code"].ToString());
                    }
                    dtUPCScan.AcceptChanges();

                    dgvPOSummary.DataSource = GetInversedDataTable(dt, "Size", new System.Collections.Generic.List<string> { "JobNo", "Color", "TtlQty", "ScanQty" }, "PackedQty", "", true, new System.Collections.Generic.List<string> { "ScanQty" });
                    
                    foreach (DataGridViewRow row in dgvPOSummary.Rows)
                    {
                        if (row.Cells["ScanQty"].Value != null && row.Cells["TtlQty"].Value != null &&
                            row.Cells["ScanQty"].Value.ToString() == row.Cells["TtlQty"].Value.ToString())
                        {
                            row.DefaultCellStyle.BackColor = Color.Green;
                        }
                    }

                    if(!dtUPCScan.Columns.Contains("CTNNo")) dtUPCScan.Columns.Add("CTNNo");
                    dgvCTNDetail.DataSource = dtUPCScan;
                    
                    int totalPacked = 0;
                    int totalScanned = 0;
                    foreach (DataRow r in dtUPCScan.Rows)
                    {
                        totalPacked += Convert.ToInt32(r["PackedQty"]);
                        totalScanned += Convert.ToInt32(r["ScanQty"]);
                    }
                    btReqQtyCTN.Text = totalPacked.ToString();
                    btInQtyCTN.Text = totalScanned.ToString();
                    btCTNNo.Text = "SO LOADED";
                    
                    tbCodeReaderSnP.Focus();
                }
                else
                {
                    MessageBox.Show("SO Number not found!", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            } catch(Exception ex) {
                MessageBox.Show("Error: " + ex.Message);
            }
        }
                private void btUnScan_Click(object sender, EventArgs e)
        {
            if (dgvCTNDetail.SelectedRows.Count == 0) {
                MessageBox.Show("Vui lòng chọn 1 dòng Size trong bảng chi tiết để thực hiện Unscan!");
                return;
            }

            string upcToUnscan = dgvCTNDetail.SelectedRows[0].Cells["UPC_Code"].Value.ToString();
            string sizeName = dgvCTNDetail.SelectedRows[0].Cells["Size"].Value.ToString();

            if (MessageBox.Show($"Bạn có chắc chắn muốn UNSCAN toàn bộ số lượng đã quét của Size {sizeName} (UPC: {upcToUnscan})?", "Confirm Unscan", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) == DialogResult.Yes)
            {
                string latestCTN = $"(SELECT TOP 1 sc.CTNBarCode FROM InlineFGsWHScan sc JOIN InlineFGsWHCTNMaster cm ON sc.CTNBarCode = cm.CTNBarCode WHERE sc.PONo = '{tbPONo.Text}' AND sc.GarmentBarcode = '{upcToUnscan}' AND (sc.ReScan IS NULL OR sc.ReScan = '0') AND (cm.ReScan IS NULL OR cm.ReScan = '0') ORDER BY sc.SysCreateDate DESC)";
                string sqlUnscan = $"UPDATE InlineFGsWHScan SET ReScan = 1, Remark1 = 'Metal/Unscan {CSDL.UserName}|{DateTime.Now.ToString("yyyyMMdd HH:mm:ss")}' " +
                                   $"WHERE PONo = '{tbPONo.Text}' AND GarmentBarcode = '{upcToUnscan}' AND (ReScan IS NULL OR ReScan = '0') AND CTNBarCode = {latestCTN}";
                mCSDL.kn.Doc(sqlUnscan);
                if (!string.IsNullOrEmpty(mCSDL.kn.ErrorMessage)) { MessageBox.Show("SQL Unscan Error: " + mCSDL.kn.ErrorMessage); return; }

                string sqlMasterUnscan = $"UPDATE InlineFGsWHCTNMaster SET ShipStatus = 'rescan', Comment1 = 'Unscan {CSDL.UserName}|{DateTime.Now.ToString("yyyyMMdd HH:mm:ss")}', ReScan = '1' " +
                                         $"WHERE CTNBarCode = {latestCTN} AND (ReScan IS NULL OR ReScan = '0')";
                mCSDL.kn.Doc(sqlMasterUnscan);
                if (!string.IsNullOrEmpty(mCSDL.kn.ErrorMessage)) { MessageBox.Show("SQL Unscan Master Error: " + mCSDL.kn.ErrorMessage); return; }

                MessageBox.Show($"Đã Unscan thành công toàn bộ số lượng Size {sizeName}!");
                LoadSO(tbOrdNo.Text);
            }
        }
        private void OptionsRework_ButtonClicked(object sender, string buttonName)
        {
            string stt = "";
            switch (buttonName)
            {
                case "btnUnScan":
                    stt = "UnScan";
                    break;
                case "btnSendToQA":
                    stt = "QA";
                    break;
            }

            if (!string.IsNullOrEmpty(stt))
            {
                if (DialogResult.Yes == MessageBox.Show("Do you agree?", "Information", MessageBoxButtons.YesNo, MessageBoxIcon.Question))
                {
                    string sql = $"EXEC dbo.InlineFGsWHSetSttUnScan\r\n\t\t @pStt\t\t\t= '{stt}'\r\n\t\t,@pCTNBarCode\t= '{tbCTNCode.Text}'\r\n\t\t,@pCreateUser\t= '{CSDL.UserName}';";

                    mCSDL.kn.Doc(sql);
                    if (mCSDL.kn.ErrorMessage != "") MessageBox.Show("Error when update status of Carton.", "", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    else
                    {
                        ltCTN.Remove(ltCTN[0]);
                        listView1.Items.Remove(listView1.Items[0]);
                        newCTNScan();
                        LoadSO(tbOrdNo.Text);
                    }
                }
            }
        }

        public Boolean IsNumber(String value)
        {
            return value.All(Char.IsDigit);
        }

        private void checkBox1_CheckedChanged(object sender, EventArgs e)
        {
            if (checkBox1.Checked)
            {
                AutoSize = true;
            }
            else
            {
                Height /= 2;
                AutoSize = false;
            }
        }

        private void tbCTNCode_TextChanged(object sender, EventArgs e)
        {
            ReScan = 0;
            if (tbCTNCode.Text.Trim().Length > 0)
            {
                try
                {
                    DataSet ds = mCSDL.kn.Doc("select top 1 RecNo from InlineFGsWHCTNMaster where CTNSeriNo = '" + tbCTNCode.Text.Trim() + "' order by RecNo desc");
                    if (ds.Tables[0].Rows.Count > 0) ReScan = int.Parse(ds.Tables[0].Rows[0][0].ToString());
                }
                catch
                {
                    MessageBox.Show("PACKING LIST NOT FOUND !!!");
                }
            }
        }
    }
}






























