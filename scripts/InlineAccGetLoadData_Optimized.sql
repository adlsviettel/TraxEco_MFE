CREATE proc [dbo].[InlineAccGetLoadData]

@type int,

@dt1 nvarchar(max),

@dt2 nvarchar(max),

@dt3 nvarchar(max),

@dt4 nvarchar(max),

@dt5 nvarchar(max),

@dt6 nvarchar(max)

as

begin

	declare @sql nvarchar(max);

	begin

		if(@type=0) -- exec InlineAccGetLoadData 0,'PFAD2112A/0012','BU','80025809','REAL RED S10 A2QN','',''

			begin

				select PO,matrclass,matrcode,Color,SuppColor,OrdQty,sum(ReceivedQty) ReceivedQty,null sizx,ID

				from InlineAccWHMaster_Backup WITH(NOLOCK)

				where PO = @dt1 and matrclass = @dt2 and matrcode = @dt3 and Color = @dt4

				group by PO,matrclass,matrcode,Color,SuppColor,OrdQty,ID

			end

		else if(@type=1) -- exec InlineAccGetLoadData 1,'','','','','',''

			begin

				--insert into InlineAccWHIssue(FacLine,Job,ID,Qty,CreatedBy,SysCreateDate,IDKB)

				--values(@dt1,@dt2,@dt3,@dt4,@dt5,getdate(),@dt6)

				select getdate()

			end

		else if(@type=2)

			begin

				insert into InlineAccKanbanReceived(Id,EmployeeRcv,DateRcv)

				values (@dt1,@dt2,getdate())

			end

		else if(@type=3) -- exec InlineAccGetLoadData 3,'SOAD2202/0180','0129832737','','','',''

			begin

				select a.SysID,a.PuOrderNo,b.MatrClass,b.MatrCode,b.Color,b.OrderNo,b.StyleNo 

				into #tt1

				from SecurityReport.dbo.purvtrx a WITH(NOLOCK) 

				inner join SecurityReport.dbo.purvtrx2 d WITH(NOLOCK) on a.SysID = d.SysID

				inner join SecurityReport.dbo.purvalc2 b WITH(NOLOCK) on a.SysID = b.SysID

				where b.OrderNo = @dt1 and b.StyleNo collate SQL_Latin1_General_CP1_CI_AS in (select Style from saoship WITH(NOLOCK) where OrderNo = @dt1 and LotRef like '%'+@dt2) and b.MatrClass <> 'FB'

				group by a.SysID,a.PuOrderNo,b.MatrClass,b.MatrCode,b.Color,b.OrderNo,b.StyleNo



				select distinct a.SysID,a.PuOrderNo,a.MatrClass,a.MatrCode,a.Color,a.OrderNo,a.StyleNo,b.smorderno SmOrderNo

				into #tt2

				from #tt1 a inner join SecurityReport.dbo.smomstr b WITH(NOLOCK) on a.StyleNo = b.style



				select PuOrderNo,MatrClass,MatrCode,Color,MatrSize,sum(Cons) Cons,Size,Unit,Factor from (select distinct a.PuOrderNo,a.MatrClass,a.MatrCode,a.Color,null MatrSize,--smb.MatrSize,

				sum(cast(replace(isnull(case when (smb.UCons <> '0') then smb.UCons else smsc.UCons end,0),',','.') as float)) as Cons

				--,case when (smsc.GmtSize is null ) then sms.sizx COLLATE Latin1_General_CI_AS else smsc.GmtSize end as Size

				,null Size

				,smb.Unit,smb.Factor 

				from #tt2 a inner join SecurityReport.dbo.smobom smb WITH(NOLOCK) on smb.SmOrderNo = a.SmOrderNo and smb.MatrCode = a.MatrCode and smb.MatrClass = a.MatrClass

				left outer join SecurityReport.dbo.smysize sms WITH(NOLOCK) on sms.SmOrderNo COLLATE Latin1_General_CI_AS = a.SmOrderNo

				left join SecurityReport.dbo.smybmsze smsc WITH(NOLOCK) on smsc.SmOrderNo = a.SmOrderNo and smsc.MatrClass = smb.MatrClass and smsc.MatrItemNo = smb.MatrItemNo

				group by a.PuOrderNo,a.MatrClass,a.MatrCode,a.Color,smb.MatrSize

				,case when (smsc.GmtSize is null ) then sms.sizx COLLATE Latin1_General_CI_AS else smsc.GmtSize end 

				,smb.Unit,smb.Factor) a where Cons <> 0

				group by PuOrderNo,MatrClass,MatrCode,Color,MatrSize,Size,Unit,Factor

			end

		else if(@type=4) -- exec InlineAccGetLoadData 4,'PGAD2202/0046','','','','',''

			begin

				select a.SysID,a.PuOrderNo,b.MatrClass,b.MatrCode,b.Color,b.OrderNo,b.StyleNo 

				into #tt11

				from SecurityReport.dbo.purvtrx a WITH(NOLOCK) 

				inner join SecurityReport.dbo.purvtrx2 d WITH(NOLOCK) on a.SysID = d.SysID

				inner join SecurityReport.dbo.purvalc2 b WITH(NOLOCK) on a.SysID = b.SysID

				where b.OrderNo = @dt1 /*and b.StyleNo collate SQL_Latin1_General_CP1_CI_AS in (select Style from saoship where OrderNo = @dt1 and LotRef like '%'+@dt2)*/ and b.MatrClass <> 'FB'

				group by a.SysID,a.PuOrderNo,b.MatrClass,b.MatrCode,b.Color,b.OrderNo,b.StyleNo



				select distinct a.SysID,a.PuOrderNo,a.MatrClass,a.MatrCode,a.Color,a.OrderNo,a.StyleNo,b.smorderno SmOrderNo

				into #tt22

				from #tt11 a inner join SecurityReport.dbo.smomstr b WITH(NOLOCK) on a.StyleNo = b.style



				select PuOrderNo,MatrClass,MatrCode,Color,MatrSize,sum(Cons) Cons,Size,Unit,Factor from (select distinct a.PuOrderNo,a.MatrClass,a.MatrCode,a.Color,null MatrSize,--smb.MatrSize,

				sum(cast(replace(isnull(case when (smb.UCons <> '0') then smb.UCons else smsc.UCons end,0),',','.') as float)) as Cons

				,null Size

				--,case when (smsc.GmtSize is null ) then sms.sizx COLLATE Latin1_General_CI_AS else smsc.GmtSize end as Size

				,smb.Unit,smb.Factor 

				from #tt22 a inner join SecurityReport.dbo.smobom smb WITH(NOLOCK) on smb.SmOrderNo = a.SmOrderNo and smb.MatrCode = a.MatrCode and smb.MatrClass = a.MatrClass

				left outer join SecurityReport.dbo.smysize sms WITH(NOLOCK) on sms.SmOrderNo COLLATE Latin1_General_CI_AS = a.SmOrderNo

				left join SecurityReport.dbo.smybmsze smsc WITH(NOLOCK) on smsc.SmOrderNo = a.SmOrderNo and smsc.MatrClass = smb.MatrClass and smsc.MatrItemNo = smb.MatrItemNo

				group by a.PuOrderNo,a.MatrClass,a.MatrCode,a.Color,smb.MatrSize

				,case when (smsc.GmtSize is null ) then sms.sizx COLLATE Latin1_General_CI_AS else smsc.GmtSize end 

				,smb.Unit,smb.Factor) a where Cons <> 0

				group by PuOrderNo,MatrClass,MatrCode,Color,MatrSize,Size,Unit,Factor

			end

		else if(@type=5) -- exec InlineAccGetLoadData 0,'PFAD2112A/0012','BU','80025809','REAL RED S10 A2QN','',''

			begin

				select PO,matrclass,matrcode,Color,SuppColor,OrdQty,sum(ReceivedQty) ReceivedQty,sizx,ID

				from InlineAccWHMaster_Backup WITH(NOLOCK) 

				where PO = @dt1 and matrclass = @dt2 and matrcode = @dt3 and Color = @dt4

				group by PO,matrclass,matrcode,Color,SuppColor,OrdQty,sizx,ID

			end

		if(@type=6)-- exec InlineAccGetLoadData 6,'PGAD2203/0008','S2206LHMU001Y','','','',''

			begin

				select distinct smb.MatrClass,smb.MatrCode,case when smb.UCons <> 0 then smb.UCons else smsc.UCons end UCons,smb.Unit,smb.Factor,smb.PerGmt,isnull(Allowance,'') as Variablescrap,

				smcol.Color Color,smb.PartName,smb.UsageSpec,smb.MatrColor,smc.color GmtColor

				from SecurityReport.dbo.smomstr sm WITH(NOLOCK) 

				left join SecurityReport.dbo.smobom smb WITH(NOLOCK) on sm.smorderno = smb.SmOrderNo

				left join DtradeProduction.dbo.acc_smycway smcol WITH(NOLOCK) on sm.SmOrderNo = smcol.SmOrderNo collate Chinese_Taiwan_Stroke_BIN and smcol.ColorGrp collate Chinese_Taiwan_Stroke_BIN = smb.MatrColor

				left join SecurityReport.dbo.smybmsze smsc WITH(NOLOCK) on smsc.SmOrderNo = sm.smorderno and smsc.MatrClass = smb.MatrClass and smsc.MatrItemNo = smb.MatrItemNo

				left join SecurityReport.dbo.smycolor smc WITH(NOLOCK) on smc.smorderno = sm.smorderno

				left join SecurityReport.dbo.purvalc2 pur2 WITH(NOLOCK) on sm.style = pur2.StyleNo and smb.MatrClass = pur2.MatrClass and smb.MatrCode = pur2.MatrCode and smcol.Color collate SQL_Latin1_General_CP1_CI_AS = pur2.Color

				where pur2.OrderNo = @dt1 and pur2.StyleNo = @dt2 and ((smcol.Color <> '*' and smcol.Color <> '') or smcol.Color is null) and (case when smb.UCons <> 0 then smb.UCons else smsc.UCons end) is not null

				order by smb.MatrClass

			end

		else if(@type=7)--exec InlineAccGetLoadData 7,'LB','62759440','H64049','PGAD2203/0008','S2206LHMU001Y',''

			begin

				select a.*,b.Qty from

				(select a.PO,a.matrclass,a.matrcode,a.Color,a.SuppColor,a.sizx,sum(a.ReceivedQty) ReceivedQty,a.ID from InlineAccWHMaster_Backup a WITH(NOLOCK) 

				inner join SecurityReport.dbo.purvalc2 b WITH(NOLOCK) on a.sysid = b.SysID and a.matrclass = b.MatrClass and a.matrcode = b.MatrCode and a.Color = b.Color

				where a.matrclass = @dt1 and a.matrcode = @dt2 and a.Color = @dt3 and b.OrderNo = @dt4 and b.StyleNo = @dt5

				group by a.PO,a.matrclass,a.matrcode,a.Color,a.SuppColor,a.sizx,a.ID) a

				left join

				(select c.OrderNo,c.Style,d.Color,d.Sizx,sum(d.Qty) Qty from DtradeProduction.dbo.saoship c WITH(NOLOCK)

				left join DtradeProduction.dbo.sahasm d WITH(NOLOCK) on c.OrderNo = d.OrderNo and c.ShipNo = d.ShipNo

				left join A1AF1Plan e WITH(NOLOCK) on c.OrderNo = e.Job_No --and c.LotRef = e.PONO and replace(e.Line,'F1','F2') = 'F2A28'

				where c.OrderNo = @dt4 and c.Style = @dt5 --and c.LotRef like '%498048'

				group by c.OrderNo,c.Style,d.Color,d.Sizx) b on a.Color collate Chinese_Taiwan_Stroke_BIN = b.Color and a.sizx collate Chinese_Taiwan_Stroke_BIN= b.Sizx

			end

		else if(@type=8)--exec InlineAccGetLoadData 8,'LB','62759440','H64049','PGAD2203/0008','S2206LHMU001Y','498048'

			begin

				select a.*,b.Qty from

				(select a.PO,a.matrclass,a.matrcode,a.Color,a.SuppColor,a.sizx,sum(a.ReceivedQty) ReceivedQty,a.ID from InlineAccWHMaster_Backup a WITH(NOLOCK) 

				inner join SecurityReport.dbo.purvalc2 b WITH(NOLOCK) on a.sysid = b.SysID and a.matrclass = b.MatrClass and a.matrcode = b.MatrCode and a.Color = b.Color

				where a.matrclass = @dt1 and a.matrcode = @dt2 and a.Color = @dt3 and b.OrderNo = @dt4 and b.StyleNo = @dt5

				group by a.PO,a.matrclass,a.matrcode,a.Color,a.SuppColor,a.sizx,a.ID) a

				left join

				(select c.OrderNo,c.Style,d.Color,d.Sizx,sum(d.Qty) Qty from DtradeProduction.dbo.saoship c WITH(NOLOCK)

				left join DtradeProduction.dbo.sahasm d WITH(NOLOCK) on c.OrderNo = d.OrderNo and c.ShipNo = d.ShipNo

				left join A1AF1Plan e WITH(NOLOCK) on c.OrderNo = e.Job_No --and c.LotRef = e.PONO and replace(e.Line,'F1','F2') = 'F2A28'

				where c.OrderNo = @dt4 and c.Style = @dt5 and c.LotRef like '%' + @dt6

				group by c.OrderNo,c.Style,d.Color,d.Sizx) b on a.Color collate Chinese_Taiwan_Stroke_BIN = b.Color and a.sizx collate Chinese_Taiwan_Stroke_BIN= b.Sizx

			end

		else if(@type=9)-- exec InlineAccGetLoadData 9,'42883','','','','',''

			begin

				--select b.PO,b.matrclass,b.matrcode,b.Color,b.qtyunit,b.ReceivedQty,sum(a.Qty) QtyIssue,b.sizx,b.ID from InlineAccWHIssue a

				--inner join InlineAccWHMaster_Backup b on a.ID = b.ID collate SQL_Latin1_General_CP1_CI_AS where a.IDKB = @dt1 and a.SysIssueDate is null

				--group by b.PO,b.matrclass,b.matrcode,b.Color,b.qtyunit,b.ReceivedQty,b.sizx,b.ID

				select getdate()

			end

		else if(@type=10)-- exec InlineAccGetLoadData 10,'F2A28','PGAD2203/0008','42883','1000','Shin',42883

			begin

				--insert into InlineAccWHIssue(FacLine,Job,ID,Qty,CreatedBy,SysCreateDate,IDKB)

				--values(@dt1,@dt2,@dt3,cast(@dt4 as float),@dt5,getdate(),cast(@dt6 as int))



				--update InlineAccWHWaitingIssue set SysIssueDate = getdate(),Comment = @dt5 where Id = cast(@dt6 as int) and ID = @dt3

				select getdate()

			end

		else if(@type=11)-- exec InlineAccGetLoadData 11,'','','','','',''

			begin

				select * from InLLanguageMst WITH(NOLOCK) 

				select * from InLMeasageMaster WITH(NOLOCK) 

				select  *  from InlineQCSystem WITH(NOLOCK)

				select * from (select distinct substring(FacZone,charindex('F',FacZone),3) FacZone from cpdtlsdays WITH(NOLOCK)) t order by FacZone

				select distinct FacLine from Tx_SP_FoldCheck WITH(NOLOCK) where /*substring(FacLine,1,2) = 'F2' and*/ FacLine not like '%N' order by FacLine

				SELECT CustmName FROM InlineFGsWHCTNCustmMgnt WITH (NOLOCK)

			end

		else if(@type=12)-- exec InlineAccGetLoadData 12,'Shieu','?','','','',''

			begin

				select * from InLineQcUserDetail WITH(NOLOCK) where EmployeeCode = @dt1 and Password = @dt2

			end

		else if(@type=13)-- exec InlineAccGetLoadData 13,'2370329015107','','','','',''

			begin

				select distinct c.Customerrequisition OrderNo,c.Itemnumber Style,substring(b.PKInsNo,1,charindex('-',b.PKInsNo)-1) LotRef,c.Pool ShipDest,d.Sizx Size,d.Color from

				(select * from Tx_SP_JobDet_UPC WITH(NOLOCK) where UPC_Code = @dt1) a

				inner join Tx_SP_FoldCheck b WITH(NOLOCK) on a.JobNo = b.JobNo and a.JobDetId = b.JobDetId and a.ColorId = b.ColorId and a.SizeId = b.SizeId

				--inner join saoship c on a.JobNo = c.OrderNo and c.LotRef = substring(b.PKInsNo,1,len(c.LotRef)) 

				inner join InlineERPWHMaterialFull c WITH(NOLOCK) on a.JobNo = c.Salesorder and charindex(c.Customerreference,b.PKInsNo) > 0

				left join sahasm d WITH(NOLOCK) on c.Salesorder = d.OrderNo and a.SizeId = d.SizeID and a.ColorId = d.ColorID

				where b.Type in (1,3)-- and c.StatusRemark is not null

			end

		else if(@type=14)

			begin

				if(@dt2<>'Warehouse')

				begin

					select SysCreateDate Date,convert(varchar(10),SysCreateDate,108) Time,JobNo,Style,PONo,ShipDest,Size,Color,Qty,Status,CreatedBy,RecNo from InlineMetalScan WITH(NOLOCK) where Factory = @dt1 and len(UPCBarCode) = 10 order by RecNo desc

				end

				else

				begin

					select SysCreateDate Date,convert(varchar(10),SysCreateDate,108) Time,JobNo,Style,PONo,ShipDest,Size,Color,Qty,Status,CreatedBy,RecNo from InlineMetalScan WITH(NOLOCK) where Factory = @dt1 and len(UPCBarCode) > 10 order by RecNo desc

				end

			end

		else if(@type=15)-- exec InlineAccGetLoadData 15,'2200451156','F1','','','',''

			begin

				select a.JOB_NO OrderNo,a.STYLE_NO Style,a.PO_NO LotRef,b.ShipDest,a.CUT_SIZE Size,a.COMBO_CODE Color from

				(select distinct PO_NO,JOB_NO,STYLE_NO,CUT_SIZE,COMBO_CODE from EndlineDecorationData WITH(NOLOCK) where BARCODE = @dt1 and OU_CODE = case when @dt2 = 'F2' then 'TR' else case when @dt2 = 'F1' then 'TP' else @dt2 end end) a

				left join saoship b WITH(NOLOCK) on a.PO_NO = b.LotRef and a.JOB_NO = b.OrderNo and a.STYLE_NO = b.Style

			end	

		else if(@type=16)-- exec InlineAccGetLoadData 16,'26094','','','','',''

			begin

				select distinct a.*,b.name_dept,null sesion,factory from 

				(select * from hr.dbo.staff WITH(NOLOCK) where id_staff like '%'+@dt1) a inner join hr.dbo.department b WITH(NOLOCK) on a.id_dept = b.id_dept



				select a.*,c.fullname,b.NameSick from

				(select * from InlineClinicEmployeeHisSick WITH(NOLOCK) where EmployeeCode like '%'+@dt1) a inner join InlineClinicSick b WITH(NOLOCK) on a.IdSick = b.IdSick

				inner join hr.dbo.staff c WITH(NOLOCK) on a.EmployeeCode = c.id_staff collate SQL_Latin1_General_CP1_CI_AS order by a.SysCreateDate desc



				select a.*,c.fullname,b.NameSick from

				(select * from InlineClinicBedHis WITH(NOLOCK) where EmployeeCode like '%'+@dt1) a inner join InlineClinicSick b WITH(NOLOCK) on a.IdSick = b.IdSick

				inner join hr.dbo.staff c WITH(NOLOCK) on a.EmployeeCode = c.id_staff collate SQL_Latin1_General_CP1_CI_AS order by a.SysCreateDate desc



			end

		else if(@type=17)-- exec InlineAccGetLoadData 17,'F2','','','','',''

			begin

				select a.IdGroup,NameGroup,TypeGroup,a.IdMed,NameMed,Unit,c.Qty - c.QtyIss Qty from InlineClinicMedecine a WITH(NOLOCK) inner join InlineClinicMedecineGroup b WITH(NOLOCK) on a.IdGroup = b.IdGroup

				inner join InlineClinicWHOfFac c WITH(NOLOCK) on a.IdMed = c.IdMed where Qty - QtyIss > 0 and c.Factory = @dt1 and c.Status is null



				select IdSick,NameSick from InlineClinicSick WITH(NOLOCK)



				select a.*,c.fullname,b.NameSick from

				(select * from InlineClinicEmployeeHisSick WITH(NOLOCK) where convert(varchar,SysCreateDate,112) = convert(varchar,getdate(),112) and IdHisMed like @dt1+'%') a inner join InlineClinicSick b WITH(NOLOCK) on a.IdSick = b.IdSick

				inner join hr.dbo.staff c WITH(NOLOCK) on a.EmployeeCode = c.id_staff collate SQL_Latin1_General_CP1_CI_AS order by a.SysCreateDate desc

			end

		else if(@type=18)-- exec InlineAccGetLoadData 18,'F2','','','','',''

			begin

				begin

					set @sql = 'create table ' + quotename(@dt1) + '(IdMed nvarchar(30),NameMed nvarchar(max),Qty int)'

				end

			end

		else if(@type=19)-- exec InlineAccGetLoadData 19,'F2','','','','',''

			begin

				declare @sql1 nvarchar(max);

				begin

					set @sql1 = 'update InlineClinicWHOfFac set InlineClinicWHOfFac.QtyIss = a.QtyIss + b.Qty from InlineClinicWHOfFac a,' + quotename(@dt1) + ' b where a.IdMed = b.IdMed and Factory = substring('''+@dt1+''',1,2) '

					+ 'insert into InlineClinicEmployeeHisMed(IdHisMed,IdMed,Qty,CreatedBy,SysCreateDate) select ''' + @dt1 + ''',IdMed,Qty,''' + @dt2 + ''',getdate() from ' + quotename(@dt1)

					+ 'insert into InlineClinicEmployeeHisSick(EmployeeCode,IdSick,IdHisMed,CreatedBy,SysCreateDate) values('''+@dt3+''','''+@dt4+''','''+@dt1+''','''+@dt2+''',getdate()) '

					+ ' drop table ' + quotename(@dt1)

				end

				execute sp_executesql @sql1

			end

		else if(@type=20)-- exec InlineAccGetLoadData 20,'','','','','',''

			begin

				select a.IdMed,a.NameMed,b.Qty,b.Exp,b.PrcBuy,b.SysCreateDate from InlineClinicMedecine a WITH(NOLOCK) inner join InlineClinicWHImport b WITH(NOLOCK) on a.IdMed = b.IdMed order by b.SysCreateDate desc



				select a.IdGroup,NameGroup,TypeGroup,a.IdMed,NameMed,Unit from InlineClinicMedecine a WITH(NOLOCK) inner join InlineClinicMedecineGroup b WITH(NOLOCK) on a.IdGroup = b.IdGroup		



				select * from InlineClinicSupp WITH(NOLOCK)

			end

		else if(@type=21)-- exec InlineAccGetLoadData 21,'F1','','','','',''

			begin

				select IdSick,NameSick from InlineClinicSick WITH(NOLOCK)



				select a.*,c.fullname,b.NameSick from

				(select * from InlineClinicBedHis WITH(NOLOCK) where convert(varchar,SysCreateDate,112) = convert(varchar,getdate(),112) and IdBedHis like @dt1+'%' and TimeOut is not null) a inner join InlineClinicSick b WITH(NOLOCK) on a.IdSick = b.IdSick

				inner join hr.dbo.staff c WITH(NOLOCK) on a.EmployeeCode = c.id_staff collate SQL_Latin1_General_CP1_CI_AS order by a.SysCreateDate desc



				select a.*,c.fullname,b.NameSick from

				(select * from InlineClinicBedHis WITH(NOLOCK) where convert(varchar,SysCreateDate,112) = convert(varchar,getdate(),112) and IdBedHis like @dt1+'%' and TimeOut is null) a inner join InlineClinicSick b WITH(NOLOCK) on a.IdSick = b.IdSick

				inner join hr.dbo.staff c WITH(NOLOCK) on a.EmployeeCode = c.id_staff collate SQL_Latin1_General_CP1_CI_AS order by a.SysCreateDate desc

			end

		else if(@type=22)-- exec InlineAccGetLoadData 22,'F2','','','','',''

			begin

				select b.IdMed,b.NameMed,a.Qty from 

				(select IdMed,sum(Qty - QtyIss) Qty from InlineClinicWHOfFac WITH(NOLOCK) where Status is null and Factory = @dt1 and Qty > QtyIss group by IdMed) a inner join InlineClinicMedecine b WITH(NOLOCK) on a.IdMed = b.IdMed

			end

		else if(@type=23)-- exec InlineAccGetLoadData 23,'20220418','20220425','F2','','',''

			begin

				--select a.EmployeeCode,b.fullname,b.gander,a.IdSick,a.SysCreateDate,a.NameSick from 

				--(select a.*,b.NameSick from

				--(select EmployeeCode,IdSick,SysCreateDate 

				--from InlineClinicEmployeeHisSick 

				--where IdHisMed like @dt1+'%' and convert(varchar,SysCreateDate,112) >= @dt2 and convert(varchar,SysCreateDate,112) <= @dt3) a

				--inner join InlineClinicSick b on a.IdSick = b.IdSick) a inner join hr.dbo.staff b on a.EmployeeCode = b.id_staff collate SQL_Latin1_General_CP1_CI_AS

				--order by a.SysCreateDate desc

				select b.IdSick,b.NameSick,count(a.EmployeeCode) Qty from 

				(select * from InlineClinicEmployeeHisSick WITH(NOLOCK) where convert(varchar,SysCreateDate,112) >= @dt1 and convert(varchar,SysCreateDate,112) <= @dt2 and IdHisMed like @dt3+'%') a

				inner join InlineClinicSick b WITH(NOLOCK) on a.IdSick = b.IdSick

				group by b.IdSick,b.NameSick

				order by count(a.EmployeeCode) desc

			end

		else if(@type=24)-- exec InlineAccGetLoadData 24,'','','','','',''

			begin

				select IdMed N'Mã thu?c',NameMed N'Tên thu?c',(select sum(Qty-QtyIss) Qty from InlineClinicWHOfFac WITH(NOLOCK) where Factory = 'F1' and Qty> QtyIss and a.IdMed = IdMed) F1,

				(select sum(Qty-QtyIss) Qty from InlineClinicWHOfFac WITH(NOLOCK) where Factory = 'F2' and Qty> QtyIss and a.IdMed = IdMed) F2,

				(select sum(Qty-QtyIss) Qty from InlineClinicWHOfFac WITH(NOLOCK) where Factory = 'F3' and Qty> QtyIss and a.IdMed = IdMed) F3,

				(select sum(Qty-QtyIss) Qty from InlineClinicWHOfFac WITH(NOLOCK) where Factory = 'F4' and Qty> QtyIss and a.IdMed = IdMed) F4

				from InlineClinicMedecine a WITH(NOLOCK)

			end

		else if(@type=25) -- exec InlineAccGetLoadData 25,'','','','','',''

			 begin

				select * from InLLanguageMst WITH(NOLOCK) 

				select * from InLMeasageMaster WITH(NOLOCK) 

				select  *  from  InlineQCSystem WITH(NOLOCK) where Descpt = 'Qc Fabric' and TIME is not null 

				select * from (select distinct substring(FacZone,charindex('F',FacZone),3) FacZone from cpdtlsdays WITH(NOLOCK)) t order by FacZone 

				select CustmName from InlineFGsWHCTNCustmMgnt WITH(NOLOCK) 

				select * from InlineQCSystem WITH(NOLOCK) where Descpt = 'Main'

				select * from (select distinct substring(FacLine,charindex('F',FacLine),5) FacLine from cpdtlsdays WITH(NOLOCK)) t order by FacLine

			 end

		else if(@type=26) -- exec InlineAccGetLoadData 26,'20220501','20220601','F2','','',''

			begin

				select b.* 

				into #t 

				from (select a.InvoiceNo, a.OrderNumber, a.RollItem, a.Color from InlineFBWHPkList a WITH(NOLOCK) inner join InlineFBRollInspt b WITH(NOLOCK) on a.QrCode = b.RollNameID where b.RecoredDate between @dt1 and dateadd(day,1,@dt2) and Fac = @dt3

				group by a.InvoiceNo,a.OrderNumber,a.RollItem,a.Color) a inner join InlineFBWHPkList b WITH(NOLOCK) on a.InvoiceNo = b.InvoiceNo and a.OrderNumber = b.OrderNumber and a.RollItem = b.RollItem and a.Color = b.Color



				select * from (select a.SupCode, round((b.LL - a.L) / b.LL * 100, 1) RFT from 

				(select SupCode, sum(ShipLength) L from #t where Qc = '*' group by SupCode) a inner join  

				(select SupCode, sum(ShipLength) LL from #t group by SupCode) b on a.SupCode = b.SupCode) a order by RFT desc



				drop table #t

			end

		else if(@type=27) -- exec InlineAccGetLoadData 27,'20220501','20220601','F2','FAR EASTERN','',''

			begin

				select b.* 

				into #tt 

				from (select a.InvoiceNo, a.OrderNumber, a.RollItem, a.Color from InlineFBWHPkList a WITH(NOLOCK) inner join InlineFBRollInspt b WITH(NOLOCK) on a.QrCode = b.RollNameID where b.RecoredDate between @dt1 and dateadd(day,1,@dt2) and Fac = @dt3

				group by a.InvoiceNo,a.OrderNumber,a.RollItem,a.Color) a inner join InlineFBWHPkList b WITH(NOLOCK) on a.InvoiceNo = b.InvoiceNo and a.OrderNumber = b.OrderNumber and a.RollItem = b.RollItem and a.Color = b.Color where b.SupCode = @dt4



				select * from (select a.SupCode, round((b.LL - a.L) / b.LL * 100, 1) RFT from 

				(select SupCode, sum(ShipLength) L from #tt where Qc = '*' group by SupCode) a inner join  

				(select SupCode, sum(ShipLength) LL from #tt group by SupCode) b on a.SupCode = b.SupCode) a order by RFT desc



				drop table #tt

			end

		else if(@type=28) -- exec InlineAccGetLoadData 28,'','','','','',''

			begin

				select CustmName from InlineFGsWHCTNCustmMgnt WITH(NOLOCK)

				select * from InlineFBDefect WITH(NOLOCK)

			end

		else if(@type=29) -- exec InlineAccGetLoadData 29,'fd3434835c6b8fd4fbd64775f9623658','','','','',''

			begin

				--0

				--select * from InlineFBWHPkList where QrCode = @dt1

				select a.*,b.ItemMoisture,c.Description

				from InlineFBWHPkList a WITH(NOLOCK) left join InlineFBStandardMoisture b WITH(NOLOCK) on a.RollItem = b.ItemCode

				left join SecurityReport.dbo.puoitem c WITH(NOLOCK) on a.OrderNumber = c.PuOrderNo collate SQL_Latin1_General_CP1_CI_AS and a.RollItem = c.MatrCode collate SQL_Latin1_General_CP1_CI_AS

				where a.QrCode = @dt1



				--1

				select * from InlineFBRollDataDtl WITH(NOLOCK) where RollNameID = @dt1



				--2

				select a.RollNameID,a.InsptWeight,a.InsptWidthB,a.InsptWidthM,a.InsptWidthE,a.InsptLenght,a.InsptReslt,a.InsptReltPer,a.Note,a.CicleHorizontal,a.CicleVertical,a.Distance_2stripes,a.Standard_Moisture,a.Actual_Measured_Moisture,a.Handfeel,a.ColorApp,a.
GSM,a.DefectCode,b.DefectName,a.DefectPoint,a.QtyDefect,a.PicLink,a.YrdsDefect

				from

				(select a.RollNameID,a.InsptWeight,a.InsptWidthB,a.InsptWidthM,a.InsptWidthE,a.InsptLenght,a.InsptReslt,a.InsptReltPer,a.Note,a.CicleHorizontal,a.CicleVertical,a.Distance_2stripes,a.Standard_Moisture,a.Actual_Measured_Moisture,a.Handfeel,a.ColorApp,a.
GSM,b.DefectCode,b.DefectPoint,b.QtyDefect,b.PicLink,b.YrdsDefect 

				from InlineFBRollInspt a WITH(NOLOCK) inner join InlineFBRollInsptDefct b WITH(NOLOCK) on a.RollNameID = b.RollNameID 

				where a.RollNameID = @dt1) a

				inner join InlineFBDefect b WITH(NOLOCK) on a.DefectCode = b.DefectCode

			end

		else if(@type=30)-- exec InlineAccGetLoadData 30,'fd3434835c6b8fd4fbd64775f9623658','','','','',''

			begin

				delete from InlineFBRollDataDtl where RollNameID = @dt1

				update InlineFBWHPkList set PrintStt = null where QrCode = @dt1

			end

		else if(@type=31)-- exec InlineAccGetLoadData 31,'6a23b487ce80d27056dd4d34337b0693','','','','',''

			begin

				select distinct c.OrderNo Job,c.StyleNo Style from SecurityReport.dbo.purvtrx a WITH(NOLOCK) inner join InlineFBRollDataDtl b WITH(NOLOCK) on a.PuOrderNo collate SQL_Latin1_General_CP1_CI_AS = b.FBPONo

				inner join SecurityReport.dbo.purvalc2 c WITH(NOLOCK) on a.SysID = c.SysId and b.FBItemNo = substring(c.MatrCode collate SQL_Latin1_General_CP1_CI_AS,1,len(b.FBItemNo))

				where b.RollNameID = @dt1



				select distinct b.customerreq Job,b.itemnumber Style from

				(select a.* from InlineERPTransactions a WITH(NOLOCK) inner join InlineFBRollDataDtl b WITH(NOLOCK) 

				on a.batchnumber collate SQL_Latin1_General_CP1_CI_AS = b.FBPONo and b.FBItemNo = substring(a.itemnumber collate SQL_Latin1_General_CP1_CI_AS,1,len(b.FBItemNo))

				where b.RollNameID = @dt1) a inner join InlineERPAllProductOrders b WITH(NOLOCK) on a.number = b.production

			end

		else if(@type=32)-- exec InlineAccGetLoadData 32,'F3','20221224','','','',''

			begin

				--select d1.*,case when d2.SUMDF is null then 0 else d2.SUMDF end SumWFT, case when d3.TotalDt is null then 0 else d3.TotalDt end TotalDt into #ttt from --round((cast(d2.SUMDF as float)/cast(d1.TotalPK as float)),3)

				--(select avg(TargetEFF) TargetEFF, min(DefSAM) SAM,

				--			AVG(Per1) Per1,AVG(Per2) Per2,AVG(Per3) Per3,AVG(Per4) Per4,AVG(Per5) Per5,AVG(Per6) Per6,AVG(Per7) Per7,AVG(Per8) Per8,

				--			SUM(LT1) LT1,SUM(LT2) LT2,SUM(LT3) LT3,SUM(LT4) LT4,SUM(LT5) LT5,SUM(LT6) LT6,SUM(LT7) LT7,SUM(LT8) LT8,

				--			AVG(RFT1) RFT1,AVG(RFT2) RFT2,AVG(RFT3) RFT3,AVG(RFT4) RFT4,AVG(RFT5) RFT5,AVG(RFT6) RFT6,AVG(RFT7) RFT7,AVG(RFT8) RFT8, 

				--			SUM(TargetPerDay) TargetPerDay,SUM(TotalPK) TotalPK,SUM(TotalRJ) TotalRJ,AVG(AvgEFFLine_) AveEFFLine,AVG(AvgRFT_) AvgRFT,

				--			SUM(W01) W01,SUM(W02) W02,SUM(W03) W03,SUM(W04) W04,SUM(W05) W05,SUM(W06) W06,SUM(W07) W07,SUM(W08) W08,SUM(TotalWorker) TotalWorker, SUM(TotalEarned) TotalEarned, FacLine 

				--				from cpdtlsdays 

				--				where FacLine like @dt1+'%'

				--						and ProDate = @dt2--'20220702' --between @BeginDate and @EndDate

				--						and left(Result,1)='_'-- and DefSAM is not null

				--						group by FacLine) d1

				--left join

				--(select b3.LINEST,sum(b3.DEFECT) SUMDF 

				--from InlineQcLayout a3 left join SubInlineQc b3 on a3.BARCODE=b3.BARCODE

				--where substring(a3.DATEST,1,8) between @dt2/*'20220702'*/ and @dt2/*'20220702'*/ and a3.BARCODE <> ''

				--group by b3.LINEST) d2

				--on

				--d2.LINEST = d1.FacLine



				--left join

				--(select FacLine, sum(datediff(minute,FirstTime,LastTime)*Qty) TotalDt from spcomment where FDDate = @dt2/*'20220702'*/ group by FacLine) d3

				-- on d3.FacLine = d1.FacLine

				-- Order by d1.FacLine asc



				-- select AVG(TargetEFF) TargetEFF from #ttt where TargetEFF is not null

				select isnull(sum(EarnTarget)/sum(TotalWorker)*100,0) TargetEFF

				from

				(select case when (isnull(TotalWorker,0)*isnull(TargetEFF,0)/100) = 0 then null else isnull(TotalWorker,0)*isnull(TargetEFF,0)/100 end EarnTarget,TotalWorker

				from cpdtlsdays WITH(NOLOCK) 

				where FacLine like @dt1+'%'

				and ProDate = @dt2

				--and left(Result,1)='_'

				) a

			end

		else if(@type=33)-- exec InlineAccGetLoadData 33,'','','','','',''

			begin

				select  *  from  InlineQCSystem WITH(NOLOCK) where Descpt = 'QCFinal'
			end

		else if(@type=34)-- exec InlineAccGetLoadData 34,'','','','','',''

			begin

				select PONo,BuyerItem,ManuSize,sum(cast(PackedQty as int)) PackedQty 

				into #Temp

				from InlineFGsWHPkList WITH(NOLOCK) where left(PONo,1) <> '4' and SysCreateDate > dateadd(month,-2,getdate())

				group by PONo,BuyerItem,ManuSize



				select distinct a.PONo,a.Status,c.EmployeeName 

				into #Temp1

				from InlineFGsWHPlanBook a WITH(NOLOCK) 

				inner join InlineFGsWHInspector b WITH(NOLOCK) on a.PlanID = b.PlanID

				inner join InLineQcUserDetail c WITH(NOLOCK) on b.Inspector = c.EmployeeCode



				select PONo,sum(cast(PackedQty as int)) Qty into #Temp2 from InlineFGsWHPkList WITH(NOLOCK) where left(PONo,1) <> '4'  and SysCreateDate > dateadd(month,-4,getdate()) group by PONo



				select a.PONo,a.ManuSize Sizx,a.BuyerItem + '_' + a.ManuSize Sku,a.PackedQty Qty,c.Qty QtyOrder,b.EmployeeName,case when isnull(b.Status,'') = '' then 'No Booking' 

				else case when isnull(b.Status,'') = 'Book' then 'Not Completed' 

				else case when isnull(b.Status,'') = 'P' then 'Accepted' else 'Fail' end end end Status,

				case when EmployeeName is not null then convert(varchar,a.PackedQty) else '' end QtyToInspt

				from #Temp a left join #Temp1 b on a.PONo = b.PONo

				left join #Temp2 c on a.PONo = c.PONo



				--drop table #Temp,#Temp1,#Temp2

			end

		else if(@type=35)-- exec InlineAccGetLoadData 35,'','','','','',''

			begin

				select * from InLineQcUserDetail WITH(NOLOCK) where Section = 'FinIns' and FacLine is not null order by EmployeeName

				select * from ReportType WITH(NOLOCK)

				select * from AQLLevel WITH(NOLOCK)

			end

		else if(@type=36)-- exec InlineAccGetLoadData 36,'0130313649','0130313815','','','',''

			begin

				select PONo,BuyerItem+'_'+ManuSize Sku,ModelNo,ManuSize,sum(cast(PackedQty as int)) PackedQty 

				from InlineFGsWHPkList WITH(NOLOCK) 

				where PONo in (@dt1,@dt2,@dt3,@dt4)

				group by PONo,BuyerItem+'_'+ManuSize,ModelNo,ManuSize



				select distinct OrderNo from InlineFGsWHPkList WITH(NOLOCK) where PONo in (@dt1,@dt2,@dt3,@dt4)

			end

		else if(@type=37)-- exec InlineAccGetLoadData 37,'','','','','',''

			begin

				select PONo,BuyerItem,ManuSize,sum(cast(PackedQty as int)) PackedQty 

				into #Tempp

				from InlineFGsWHPkList WITH(NOLOCK) where left(PONo,1) <> '4' and SysCreateDate > dateadd(month,-6,getdate())

				group by PONo,BuyerItem,ManuSize



				select distinct a.PONo,a.Status,c.EmployeeName 

				into #Temp11

				from InlineFGsWHPlanBook a WITH(NOLOCK) 

				inner join InlineFGsWHInspector b WITH(NOLOCK) on a.PlanID = b.PlanID

				inner join InLineQcUserDetail c WITH(NOLOCK) on b.Inspector = c.EmployeeCode



				select PONo,sum(cast(PackedQty as int)) Qty into #Temp22 from InlineFGsWHPkList WITH(NOLOCK) where left(PONo,1) <> '4'  and SysCreateDate > dateadd(month,-6,getdate()) group by PONo



				select a.PONo,a.ManuSize Sizx,a.BuyerItem + '_' + a.ManuSize Sku,a.PackedQty Qty,c.Qty QtyOrder,b.EmployeeName,case when isnull(b.Status,'') = '' then 'No Booking' 

				else case when isnull(b.Status,'') = 'Book' then 'Not Completed' 

				else case when isnull(b.Status,'') = 'P' then 'Accepted' else 'Fail' end end end Status,

				case when EmployeeName is not null then convert(varchar,a.PackedQty) else '' end QtyToInspt

				from #Tempp a inner join #Temp11 b on a.PONo = b.PONo

				left join #Temp22 c on a.PONo = c.PONo where b.Status = 'Book'



				--drop table #Temp,#Temp1,#Temp2

			end

		else if(@type=38)-- exec InlineAccGetLoadData 38,'0130313649','0130313815','','','',''

			begin

				select a.*,b.Inspector,c.EmployeeName,b.InsQty from InlineFGsWHPlanBook a WITH(NOLOCK) inner join InlineFGsWHInspector b WITH(NOLOCK) on a.PlanID = b.PlanID inner join InLineQcUserDetail c WITH(NOLOCK) on b.Inspector = c.EmployeeCode

				where a.PONo = case when @dt1 <> '' and @dt2 <> '' and @dt3 <> '' and @dt4 <> '' then (@dt1+','+@dt2+','+@dt3+','+@dt4)

				else case when @dt1 <> '' and @dt2 <> '' and @dt3 <> '' and @dt4 = '' then (@dt1+','+@dt2+','+@dt3)

				else case when @dt1 <> '' and @dt2 <> '' and @dt3 = '' and @dt4 = '' then (@dt1+','+@dt2)

				else @dt1 end end end

			end

		else if(@type=39)-- exec InlineAccGetLoadData 39,'Adidas','','','','',''

			begin

				if(@dt1='Adidas')

					begin

						select PlanRefNo, PONo, count(distinct CTNNo) ReqCTN, cast(round(sum(cast(GrssW as float)) ,3) as decimal(10,3)) TTGrssW, 

						cast(round(sum(cast(NetW as float)) ,3) as decimal(10,3)) TTNetW, cast(sum(CBM) as decimal(10,3)) TTCBM 

						from (select distinct replace(PlanRefNo,char(10),'') PlanRefNo, PONo, BuyerItem, ModelNo, CTNNo, case when isnull(GrssW,'') <> '' then GrssW else '0' end GrssW,case when isnull(NetW,'') <> '' then NetW else '0' end NetW, (cast(isnull(CTNL,0) as floa
t) * cast(isnull(CTNW,0) as float) * cast(isnull(CTNH,0) as float)) CBM  

						from InlineFGsWHPkList WITH(NOLOCK) where SysCreateDate >= dateadd(day, -180, getdate()) and left(PONo,1) <> '4') a group by PlanRefNo, PONo order by PONo desc

					end

				else if(@dt1='Puma')

					begin

						select PlanRefNo, PONo, count(distinct CTNNo) ReqCTN, cast(round(sum(cast(GrssW as float)) ,3) as decimal(10,3)) TTGrssW, 

						cast(round(sum(cast(NetW as float)) ,3) as decimal(10,3)) TTNetW, cast(sum(CBM) as decimal(10,3)) TTCBM 

						from (select distinct replace(PlanRefNo,char(10),'') PlanRefNo, PONo, BuyerItem, ModelNo, CTNNo, case when isnull(GrssW,'') <> '' then GrssW else '0' end GrssW,case when isnull(NetW,'') <> '' then NetW else '0' end NetW, (cast(isnull(CTNL,0) as floa
t) * cast(isnull(CTNW,0) as float) * cast(isnull(CTNH,0) as float)) CBM  

						from InlineFGsWHPkList WITH(NOLOCK) where SysCreateDate >= dateadd(day, -180, getdate()) and left(PONo,1) = '4') a group by PlanRefNo, PONo order by PONo desc

					end

			end

		else if(@type=40)-- exec InlineAccGetLoadData 40,'003939','','','','',''

			begin

				select distinct a.*,b.PickSize,c.Approval Status from

				(select distinct purchaseorder,itemnumber,size,color,warehouse,purqty,unit,purchaseorder+'+'+itemnumber+'+'+size+'+'+color+'+'+purqty+'+'+unit ID 

				from InlineERPPackingList WITH(NOLOCK)

				where lower(purchaseorder) like '%'+lower(@dt1)) a 

				left join InlineAccWHPickSize b WITH(NOLOCK) on a.ID = b.ID

				left join InlineAccWHInsptApproval c WITH(NOLOCK) on b.ID = c.ID



				select * from InlineERPPackingList WITH(NOLOCK) where lower(purchaseorder) like '%' + lower(@dt1)

			end

		else if(@type=41)-- exec InlineAccGetLoadData 41,'','','','','',''

			begin

				select * from InlineFBWHPkList WITH(NOLOCK) where lower(InvoiceNo) like '%'+lower(@dt1)

			end

		else if(@type=42)-- exec InlineAccGetLoadData 42,'1','Production_113123','','','',''

			begin

				declare @sqlq nvarchar(max);

				if(@dt1=0)

				begin

					set @sqlq = 'CREATE TABLE '+quotename(@dt2)+'(

						[Salesorder] [nvarchar](255) NULL,

						[Customeraccount] [nvarchar](255) NULL,

						[Customername] [nvarchar](255) NULL,

						[Ordertype] [nvarchar](255) NULL,

						[Invoiceaccount] [nvarchar](255) NULL,

						[Status] [nvarchar](255) NULL,

						[Donotprocess] [nvarchar](255) NULL,

						[Salestaker] [nvarchar](255) NULL,

						[Authorizationcode] [nvarchar](255) NULL,

						[Buyergroup] [nvarchar](255) NULL,

						[Confirmedreceipt date] [datetime] NULL,

						[Customername2] [nvarchar](255) NULL,

						[CustomerorderNo] [nvarchar](255) NULL,

						[Customerreference] [nvarchar](255) NULL,

						[Customerrequisition] [nvarchar](255) NULL,

						[Deliverydatecontrol] [nvarchar](255) NULL,

						[Deliveryname] [nvarchar](255) NULL,

						[Deliveryreason] [nvarchar](255) NULL,

						[Deliveryterms] [nvarchar](255) NULL,

						[Directdelivery] [nvarchar](255) NULL,

						[Salesordertype] [nvarchar](255) NULL,

						[Factorycode] [nvarchar](255) NULL,

						[Orderclass] [nvarchar](255) NULL,

						[PODeliverydate] [nvarchar](255) NULL,

						[POWELL] [nvarchar](255) NULL,

						[Pool] [nvarchar](255) NULL,

						[Purchaseorder] [nvarchar](255) NULL,

						[Quantity] [float] NULL,

						[Quotation] [nvarchar](255) NULL,

						[SOWELL] [nvarchar](255) NULL,

						[Createddateandtime] [datetime] NULL

					)'

				end

				else if(@dt1=1)

				begin

					set @sqlq = 'CREATE TABLE [dbo].'+quotename(@dt2)+'(

						[Production] [nvarchar](255) NULL,

						[JobNumber] [nvarchar](255) NULL,

						[Productnumber] [nvarchar](255) NULL,

						[Itemnumber] [nvarchar](255) NULL,

						[Quantity] [float] NULL,

						[Reportremainderasfinished] [float] NULL,

						[Lockedforrescheduling] [nvarchar](255) NULL,

						[Status] [nvarchar](255) NULL,

						[Startdate] [datetime] NULL,

						[BOMnumber] [nvarchar](255) NULL,

						[Routenumber] [nvarchar](255) NULL,

						[Delivery] [datetime] NULL,

						[Remainstatus] [nvarchar](255) NULL,

						[Referencetype] [nvarchar](255) NULL,

						[Pool] [nvarchar](255) NULL,

						[Customeraccount] [nvarchar](255) NULL,

						[ReqQty] [float] NULL,

						[BOMdate] [datetime] NULL,

						[Customerrequisition] [nvarchar](255) NULL,

						[Itemnumber2] [nvarchar](255) NULL,

						[Itemsalestaxgroup] [nvarchar](255) NULL,

						[JobNumber2] [nvarchar](255) NULL,

						[LotID] [nvarchar](255) NULL,

						[Numbersequence group] [nvarchar](255) NULL,

						[Pool2] [nvarchar](255) NULL,

						[Productiongroup] [nvarchar](255) NULL,

						[Quantity2] [float] NULL,

						[Quantity3] [float] NULL,

						[Referencenumber] [nvarchar](255) NULL,

						[SalesorderNo] [nvarchar](255) NULL,

						[Status2] [nvarchar](255) NULL,

						[Time] [datetime] NULL,

						[Type] [nvarchar](255) NULL,

						[Configuration] [nvarchar](255) NULL,

						[Itemnumber3] [nvarchar](255) NULL,

						[Productnumber2] [nvarchar](255) NULL,

						[Productiontype] [nvarchar](255) NULL,

						[Size] [nvarchar](255) NULL,

						[Style] [nvarchar](255) NULL,

						[Customerreference] [nvarchar](255) NULL,

						[Color] [nvarchar](255) NULL

					)'

				end

				else if(@dt1=2)

				begin

					set @sqlq='CREATE TABLE [dbo].'+quotename(@dt2)+'(

						[Purchaseorder] [nvarchar](255) NULL,

						[Itemnumber] [nvarchar](255) NULL,

						[Configuration] [nvarchar](255) NULL,

						[Size] [nvarchar](255) NULL,

						[Color] [nvarchar](255) NULL,

						[Style] [nvarchar](255) NULL,

						[Site] [nvarchar](255) NULL,

						[Warehouse] [nvarchar](255) NULL,

						[Batchnumber] [nvarchar](255) NULL,

						[Location] [nvarchar](255) NULL,

						[Purchasequantity] [float] NULL,

						[Unit] [nvarchar](255) NULL,

						[Salesorder] [nvarchar](255) NULL,

						[Salesordertype] [nvarchar](255) NULL,

						[CustomerPO] [nvarchar](255) NULL,

						[Itemnumber2] [nvarchar](255) NULL,

						[Configuration2] [nvarchar](255) NULL,

						[Size2] [nvarchar](255) NULL,

						[Color2] [nvarchar](255) NULL,

						[Style2] [nvarchar](255) NULL,

						[Site2] [nvarchar](255) NULL,

						[Warehouse2] [nvarchar](255) NULL,

						[Batchnumber2] [nvarchar](255) NULL,

						[Location2] [nvarchar](255) NULL,

						[Serialnumber] [nvarchar](255) NULL,

						[Firmingdate] [datetime] NULL,

						[Firmedby] [nvarchar](255) NULL,

						[LotID] [nvarchar](255) NULL,

						[Hashcode] [nvarchar](255) NULL,

						[Createddateandtime] [datetime] NULL

					)'

				end

				else if(@dt1=3)

				begin

					set @sqlq='CREATE TABLE [dbo].'+quotename(@dt2)+'(

						[Itemnumber] [nvarchar](255) NULL,

						[Productname] [nvarchar](255) NULL,

						[Searchname] [nvarchar](255) NULL,

						[Producttype] [nvarchar](255) NULL,

						[Productsubtype] [nvarchar](255) NULL,

						[Productdimension groups] [nvarchar](255) NULL,

						[Productlifecycle state] [nvarchar](255) NULL,

						[Alternativeconfiguration] [nvarchar](255) NULL,

						[Alternativesize] [nvarchar](255) NULL,

						[Alternativestyle] [nvarchar](255) NULL,

						[BOMunit] [nvarchar](255) NULL,

						[Customcode] [nvarchar](255) NULL,

						[Defaultconfiguration] [nvarchar](255) NULL,

						[Defaultstyle] [nvarchar](255) NULL,

						[Itemnumber2] [nvarchar](255) NULL,

						[Styleowner name] [nvarchar](255) NULL,

						[Itemnumber3] [nvarchar](255) NULL,

						[PurUnit] [nvarchar](255) NULL,

						[Unitinventory] [nvarchar](255) NULL,

						[Unit] [nvarchar](255) NULL

					)'

				end

				else if(@dt1=4)

				begin

					set @sqlq='CREATE TABLE [dbo].'+quotename(@dt2)+'(

						[Productnumber] [nvarchar](255) NULL,

						[Number] [nvarchar](255) NULL,

						[Batchnumber] [nvarchar](255) NULL,

						[Itemnumber] [nvarchar](255) NULL,

						[Physicaldate] [datetime] NULL,

						[Financialdate] [nvarchar](255) NULL,

						[Reference] [nvarchar](255) NULL,

						[Receipt] [nvarchar](255) NULL,

						[Issue] [nvarchar](255) NULL,

						[Unit] [nvarchar](255) NULL,

						[Configuration] [nvarchar](255) NULL,

						[Quantity] [float] NULL,

						[Size] [nvarchar](255) NULL,

						[Color] [nvarchar](255) NULL,

						[Style] [nvarchar](255) NULL,

						[Site] [nvarchar](255) NULL,

						[Warehouse] [nvarchar](255) NULL,

						[Location] [nvarchar](255) NULL,

						[Serial number] [nvarchar](255) NULL,

						[Owner] [nvarchar](255) NULL,

						[ItemGroupId] [nvarchar](255) NULL,

						[JobNumber] [nvarchar](255) NULL,

						[Customerreference] [nvarchar](255) NULL,

						[Customerorder No] [nvarchar](255) NULL,

						[Number2] [nvarchar](255) NULL,

						[Financialdate2] [nvarchar](255) NULL,

						[Invoice] [nvarchar](255) NULL,

						[Issuestatus] [nvarchar](255) NULL,

						[Packingslip] [nvarchar](255) NULL,

						[Physicaldate2] [datetime] NULL

					)'

				end

				else if(@dt1=5)

					begin

						set @sqlq='CREATE TABLE '+quotename(@dt2)+'(

							Company nvarchar(255),

							Production nvarchar(255),

							Salesorder nvarchar(255),

							Customerrequisition nvarchar(255),

							Customerreference nvarchar(255),

							CustomerNo nvarchar(255),

							Pool nvarchar(255),

							Buyergroup nvarchar(255),

							FGStyle nvarchar(255),

							Itemnumber nvarchar(255),

							GarmentColor nvarchar(255),

							UnitOfFG nvarchar(255),

							OrderDate datetime,

							Salesordertype nvarchar(255),

							Status nvarchar(255),

							SalesorderShippingDate datetime,

							POStatdate datetime,

							Lastproductiondate datetime,

							PODeliverydate datetime,

							CustomerorderNo nvarchar(255),

							Orderclass nvarchar(255),

							GSP nvarchar(255),

							SOWELL nvarchar(255),

							POWELL nvarchar(255),

							MatrClass nvarchar(255),

							MaterialCode nvarchar(255),

							MaterialName nvarchar(255),

							BomConfigId nvarchar(255),

							Color nvarchar(255),

							ColorName nvarchar(255),

							Size nvarchar(255),

							RMStyle nvarchar(255),

							RequireQty float,

							ReserveQty float,

							UnitOfRM nvarchar(255),

							OperNo float,

							Purchaseleadtime float,

							Issuestatus nvarchar(255),

							InventBatchIdPO nvarchar(255),

							FirmHistory nvarchar(255),

							SuppCode nvarchar(255),

							Supplier nvarchar(255),

							Approvalstatus nvarchar(255),

							Purchaseorderstatus nvarchar(255),

							BuyergroupPO nvarchar(255),

							PODate datetime,

							DeliveryDate datetime,

							FinalETADate datetime,

							ActualLeadtime float,

							Remarks nvarchar(max),

							Text nvarchar(max),

							PriceRMPO float,

							UnitOfRMPO nvarchar(255),

							QuantityPO float,

							QuantityPendingInPO float,

							Warehouse nvarchar(255),

							Location nvarchar(255),

							Referencelot nvarchar(255),

							Countryregion nvarchar(255),

							Customcode nvarchar(255),

							Productreceipt nvarchar(255),

							Declarationnumber nvarchar(255),

							PartName nvarchar(max),

							QuantitySalesline  float,

							Bomconsumption float,

							Requestedshipdate datetime,

							Productname nvarchar(255),

							Description nvarchar(max),

							PartName2 nvarchar(max),

							Description2 nvarchar(max),

							Receiveddate nvarchar(255),

							Serialnumber nvarchar(255),

							Createddateandtime datetime)'

					end

					else if(@dt1=6)

						begin

							set @sqlq='CREATE TABLE '+quotename(@dt2)+'(

							[Productnumber] [nvarchar](255) NULL,

							[Itemnumber] [nvarchar](255) NULL,

							[Physicaldate] [nvarchar](10) NULL,

							[Financialdate] [nvarchar](255) NULL,

							[Reference] [nvarchar](255) NULL,

							[LotID] [nvarchar](30) NULL,

							[Number] [nvarchar](255) NULL,

							[Receipt] [nvarchar](255) NULL,

							[Issue] [nvarchar](255) NULL,

							[Quantity] [float] NULL,

							[Unit] [nvarchar](255) NULL,

							[Costamount] [float] NULL,

							[Configuration] [nvarchar](255) NULL,

							[Size] [nvarchar](255) NULL,

							[Color] [nvarchar](255) NULL,

							[Style] [nvarchar](255) NULL,

							[Site] [nvarchar](255) NULL,

							[Warehouse] [nvarchar](255) NULL,

							[Batchnumber] [nvarchar](255) NULL,

							[Location] [nvarchar](255) NULL,

							[Serialnumber] [nvarchar](255) NULL,

							[Financialvoucher] [nvarchar](50) NULL,

							[Invoice] [nvarchar](255) NULL,

							[Physicalvoucher] [nvarchar](100) NULL,

							[Valueopen] [nvarchar](20) NULL,

							[Searchname] [nvarchar](100) NULL,

							[ItemGroup] [nvarchar](255) NULL,

							[ProductReceipt] [nvarchar](100) NULL,

							[Declarationnumber] [nvarchar](100) NULL,

							[Customcode] [nvarchar](20) NULL,

							[Financialcostamount] [float] NULL,

							[physicalcostamount] [float] NULL,

							[Adjustmentcostamount] [float] NULL,

							[OffsetAccount] [nvarchar](10) NULL,

							[JobNumber] [nvarchar](255) NULL,

							[Customerreference] [nvarchar](255) NULL,

							[CustomerorderNo] [nvarchar](255) NULL,

							[JournalId] [nvarchar](255) NULL

							--[POReciveDate] [nvarchar](50) NULL

							)'			

						end

				exec sp_executesql @sqlq

			end

		else if(@type=43)-- exec InlineAccGetLoadData 43,'','','','','',''

			begin

				select PlanRefNo,PONo,sum(PackedQty) Qty,BuyerItem+'_'+ManuSize SKU 

				into #t1

				from InlineFGsWHPkList WITH(NOLOCK) 

				where left(PONo,1) <> '4' and SysCreateDate >= dateadd(month,-4,getdate()) 

				group by PlanRefNo,PONo,BuyerItem+'_'+ManuSize



				select PlanRefNo,PONo,sum(Qty) QtyTotal

				into #t2

				from #t1

				group by PlanRefNo,PONo



				select a.PlanRefNo,a.PONo,a.Qty,a.SKU,b.QtyTotal,case when c.Status = 'Book' then 'Not Completed' else case when c.Status = 'F' then 'Reject' else case when c.Status = 'P' then 'Accepted' else '' end end end Status,c.CreatedBy Inspector,max(d.SysCreat
eDate) SubDate

				into #t3

				from #t1 a inner join #t2 b on a.PlanRefNo = b.PlanRefNo and a.PONo = b.PONo 

				left join InlineFGsWHPlanBook c WITH(NOLOCK) on a.PlanRefNo = c.JobNo and a.PONo = c.PONo

				left join InlineFGsWHPOSFTP d WITH(NOLOCK) on a.PONo = d.PONo and a.PlanRefNo = d.PlanRef AND c.PONo = d.PONo and c.JobNo = d.PlanRef

				group by a.PlanRefNo,a.PONo,a.Qty,a.SKU,b.QtyTotal,case when c.Status = 'Book' then 'Not Completed' else case when c.Status = 'F' then 'Reject' else case when c.Status = 'P' then 'Accepted' else '' end end end,c.CreatedBy

				--left join InlineFGsWHInspector d on c.PlanID = d.PlanID



				select distinct a.PlanRefNo,a.PONo ,a.Qty,a.SKU ,a.QtyTotal,case when Status <> '' then cast(a.Qty as varchar) else '' end QtyInspt,b.EmployeeName Inspector,a.SubDate,a.Status

				from #t3 a left join InLineQcUserDetail b WITH(NOLOCK) on a.Inspector = b.EmployeeCode

				order by a.PlanRefNo,a.PONo

				drop table #t1,#t2,#t3

			end

		else if(@type=44)-- exec InlineAccGetLoadData 44,'F2','','','','',''

			begin

				if(@dt1<>'Ad')

					begin

						select * from InLineQcUserDetail WITH(NOLOCK) where FacLine = @dt1 and Section = 'FinIns'

						select * from ReportType WITH(NOLOCK)

					end

				else

					begin

						select * from InLineQcUserDetail WITH(NOLOCK) where Section = 'FinIns'

						select * from ReportType WITH(NOLOCK)

					end

			end

		else if(@type=45)-- exec InlineAccGetLoadData 45,'thuyvo','','','','',''

			begin

				select * from InlineHisLoginUser WITH(NOLOCK) where UserName = @dt1

			end

		else if(@type=46)-- exec InlineAccGetLoadData 46,'Shieu','','','','',''

			begin

				insert into InlineHisLoginUser(UserName,Status,DeviceLogin,TimeLogin) values (@dt1,1,@dt3,getdate())

			end

		else if(@type=47)-- exec InlineAccGetLoadData 47,'Shieu','logout','aaa','','',''

			begin

				if(@dt2='login')

					begin

						update InlineHisLoginUser set Status = 1,TimeLogin = getdate(),TimeLogout = null where UserName = @dt1

					end

				else if(@dt2='logout')

					begin

						update InlineHisLoginUser set Status = 0,TimeLogout = getdate() where UserName = @dt1

						insert into InlineHisLoginUserLog(UserName,Device,TimeIn,TimeOut) select @dt1,@dt3,TimeLogin,getdate() from InlineHisLoginUser where UserName = @dt1

					end

			end

		else if(@type=48)-- exec InlineAccGetLoadData 48,'Regular orders (AQL 1.0, Level I)','9','','','',''

			begin

				select * from AQLLevel WITH(NOLOCK) where Dept = 'Quality' and LevelNo = @dt1 and LoadSize1 <= @dt2 and LoadSize2 >= @dt2

			end

		else if(@type=49)-- exec InlineAccGetLoadData 49,'123','','','','',''

			begin

				select * from InlineFGsWHPlanBook WITH(NOLOCK) where charindex(PONo, @dt1) > 0

			end

		else if(@type=50)-- exec InlineAccGetLoadData 50,'F2','','','','',''

			begin

				select * 

				into #tIn

				from InlineFBRollDataDtl WITH(NOLOCK) where Fac = @dt1 and OK = 0



				select b.InvoiceNo,b.SupCode,b.OrderNumber PONo,b.RollItem,case when charindex(' ',ltrim(rtrim(b.Color))) = 0 then ltrim(rtrim(b.Color)) else reverse(ltrim(rtrim(substring(reverse(b.Color),1,charindex(' ',reverse(b.Color)))))) + ' ' + reverse(ltrim(r
trim(substring(reverse(b.Color),charindex(' ',reverse(b.Color))+1,len(reverse(b.Color)))))) end Color ,

				b.BatchNo LOT,b.RollNo,cast(b.ShipLength as float) OrdQty,cast(a.FoC_ExYrds as float) Balance,b.Width,b.NW,b.GW,b.Qc,case when isnull(a.Pass,'') = 'P' then 'OK' else case when isnull(a.Pass,'') = 'F' then 'Reject' else '' end end Status,a.Note Remarks
,a.RollLocation Location,a.RecoredDate ImportDate,b.QrCode

				into #tIn1

				from #tIn a inner join InlineFBWHPkList b WITH(NOLOCK) on a.RollNameID = b.QrCode



				select a.*,b.InsptReslt QCStatus

				from #tIn1 a left join InlineFBRollInspt b WITH(NOLOCK) on a.QrCode = b.RollNameID

			end

		else if(@type=51)-- exec InlineAccGetLoadData 51,'F2','20220103','20220803','','',''

			begin

				select * 

				into #tR

				from InlineFBRollRelx WITH(NOLOCK) 

				where Fac = @dt1 and Comment is null-- and convert(varchar(10),RecoredDate,112) between @dt2 and @dt3 



				select b.InvoiceNo,b.SupCode,b.OrderNumber PONo,b.RollItem,case when charindex(' ',ltrim(rtrim(b.Color))) = 0 then ltrim(rtrim(b.Color)) else reverse(ltrim(rtrim(substring(reverse(b.Color),1,charindex(' ',reverse(b.Color)))))) + ' ' + reverse(ltrim(rt
rim(substring(reverse(b.Color),charindex(' ',reverse(b.Color))+1,len(reverse(b.Color)))))) end Color ,

				b.BatchNo LOT,b.RollNo,cast(b.ShipLength as float) OrdQty,b.Qc,a.RecoredDate RelaxDate,b.QrCode

				into #tR1

				from #tR a inner join InlineFBWHPkList b WITH(NOLOCK) on a.RollNameID = b.QrCode

				group by b.InvoiceNo,b.SupCode,b.OrderNumber,b.RollItem,case when charindex(' ',ltrim(rtrim(b.Color))) = 0 then ltrim(rtrim(b.Color)) else reverse(ltrim(rtrim(substring(reverse(b.Color),1,charindex(' ',reverse(b.Color)))))) + ' ' + reverse(ltrim(rtrim
(substring(reverse(b.Color),charindex(' ',reverse(b.Color))+1,len(reverse(b.Color)))))) end ,

				b.BatchNo ,b.RollNo,cast(b.ShipLength as float),b.Qc,a.RecoredDate,b.QrCode



				select a.*,b.RollLocation Location from #tR1 a left join InlineFBRollDataDtl b WITH(NOLOCK) on a.QrCode = b.RollNameID order by a.RelaxDate desc

			end

		else if(@type=52)-- exec InlineAccGetLoadData 52,'F2','','','','',''

			begin

				select * 

				into #tI

				from InlineFBRollOutput WITH(NOLOCK) where fac = @dt1



				select b.InvoiceNo,b.SupCode,b.OrderNumber PONo,b.RollItem,case when charindex(' ',ltrim(rtrim(b.Color))) = 0 then ltrim(rtrim(b.Color)) else reverse(ltrim(rtrim(substring(reverse(b.Color),1,charindex(' ',reverse(b.Color)))))) + ' ' + reverse(ltrim(rt
rim(substring(reverse(b.Color),charindex(' ',reverse(b.Color))+1,len(reverse(b.Color)))))) end Color ,

				b.BatchNo LOT,b.RollNo,cast(b.ShipLength as float) OrdQty,a.yrds QtyIssue,b.Width,b.NW,b.GW,b.Qc,a.dateout IssueDate,a.job OrderNo,b.QrCode

				from #tI a inner join InlineFBWHPkList b WITH(NOLOCK) on a.rollnameid = b.QrCode

				group by b.InvoiceNo,b.SupCode,b.OrderNumber,b.RollItem,case when charindex(' ',ltrim(rtrim(b.Color))) = 0 then ltrim(rtrim(b.Color)) else reverse(ltrim(rtrim(substring(reverse(b.Color),1,charindex(' ',reverse(b.Color)))))) + ' ' + reverse(ltrim(rtrim
(substring(reverse(b.Color),charindex(' ',reverse(b.Color))+1,len(reverse(b.Color)))))) end ,

				b.BatchNo,b.RollNo,cast(b.ShipLength as float),b.Width,b.NW,b.GW,b.Qc,a.dateout,a.job,a.yrds,b.QrCode

				order by a.dateout desc

			end

		else if(@type=53)-- exec InlineAccGetLoadData 53,'F2','','','','',''

			begin

				select distinct a.*,b.ColorCode

				from

				(select PlanDate,Style,Job,ItemNo,Color 

				from CuttingPlanning WITH(NOLOCK) where right(Factory,2) = @dt1 and PlanDate >= dateadd(day,-7,getdate())) a

				inner join InlineFBColorItem b WITH(NOLOCK) on a.Color = b.ColorName

				order by PlanDate desc

			end

		else if(@type=54)-- exec InlineAccGetLoadData 54,'F2206GHTT101','AA2208/00106','62696410-70','AD8T','',''

			begin

				select a.Purchaseorder,a.Itemnumber,a.Color,a.Purchasequantity,a.Salesorder,a.CustomerPO from

				(select * from InlineERPECCReqPOFirmHistory WITH(NOLOCK) where Itemnumber = @dt3 and Itemnumber2 = @dt1 /*and charindex('TEST',CustomerPO2) = 0*/ and charindex(Color,@dt4) > 0) a

				inner join InlineERPProductionOrders b WITH(NOLOCK) on a.Salesorder = b.SalesorderNo and a.CustomerPO = b.Customerreference

				where b.Customerrequisition = @dt2

				group by a.Purchaseorder,a.Itemnumber,a.Color,a.Purchasequantity,a.Salesorder,a.CustomerPO

			end

		else if(@type=55)-- exec InlineAccGetLoadData 55,'F2','','','','',''

			begin

				--select * 

				--into #tinspt1

				--from InlineFBRollInspt WITH(NOLOCK) where Fac = @dt1 and InsptDate >= dateadd(day,-90,getdate())



				--select b.InvoiceNo,b.SupCode,b.OrderNumber,b.RollItem,b.Color,b.BatchNo,b.RollNo,b.ShipLength,a.InsptLenght,a.InsptWidthB,a.InsptWidthM,a.InsptWidthE,a.InsptReslt,a.InsptReltPer,convert(varchar(10),a.InsptDate,120) RecoredDate,convert(varchar(8),a.I
nsptDate,108) TimeCheck,RecoredDate DateTimeCompleted,a.CreatedBy,b.QrCode

				--into #tinspt2

				--from #tinspt1 a 

				--inner join InlineFBWHPkList b WITH(NOLOCK) on a.RollNameID = b.QrCode



				--select distinct a.InvoiceNo,a.SupCode,a.OrderNumber,a.RollItem,a.Color,a.BatchNo,a.RollNo,a.ShipLength,a.InsptLenght,a.InsptWidthB,a.InsptWidthM,a.InsptWidthE,a.InsptReslt,a.InsptReltPer,a.RecoredDate,a.TimeCheck,a.DateTimeCompleted,a.CreatedBy,b.Ro
llLocation

				--,c.LabdipRemark Exception,b.RollNameID into #t55

				--from #tinspt2 a

				--left join InlineFBRollDataDtl b WITH(NOLOCK) on a.QrCode = b.RollNameID

				--left join Exception c WITH(NOLOCK) on charindex(c.MaterialCode,a.RollItem) > 0 and CHARINDEX(c.Color,a.Color)>0 --and reverse(substring(reverse(a.Color),1,charindex(' ',reverse(a.Color)))) = reverse(substring(reverse(c.Color),1,charindex(' ',reverse
(c.Color)))) 

				----and c.MtlSuppLifecycleState like '%RELEASE%'

				----order by a.RecoredDate desc

				--select distinct a.InvoiceNo,a.SupCode,a.OrderNumber,a.RollItem,a.Color,a.BatchNo,a.RollNo,a.ShipLength,a.InsptLenght,a.InsptWidthB,a.InsptWidthM,a.InsptWidthE,a.InsptReslt,a.InsptReltPer,a.RecoredDate,a.TimeCheck,a.DateTimeCompleted,a.CreatedBy,a.Ro
llLocation

				--,Exception=STUFF((SELECT '-' + cast(Exception as nvarchar(1000))

    --          FROM #t55 b

    --          WHERE a.RollNameID = b.RollNameID

    --          FOR XML PATH (''))

    --         , 1, 1, ''),a.RollNameID

				--from #t55 a

				--order by RecoredDate

				select * 
				into #tinspt1
				from InlineFBRollInspt WITH(NOLOCK) where Fac = @dt1 and InsptDate >= dateadd(day,-90,getdate())

				select b.InvoiceNo,b.SupCode,b.OrderNumber,b.RollItem, SUBSTRING(b.RollItem,0,CHARINDEX('-',b.RollItem)) AS NewRollIt
em,b.Color,b.BatchNo,b.RollNo,b.ShipLength,a.InsptLenght,a.InsptWidthB,a.InsptWidthM,a.InsptWidthE,a.InsptReslt,a.InsptReltPer,convert(varchar(10),a.InsptDate,120) RecoredDate,convert(varchar(8),a.InsptDate,108) TimeCheck,RecoredDate DateTimeCompleted,a.C
reatedBy,b.QrCode
				into #tinspt2
				from #tinspt1 a 
					inner join InlineFBWHPkList b WITH(NOLOCK) on a.RollNameID = b.QrCode

				SELECT distinct a.InvoiceNo,a.SupCode,a.OrderNumber,a.RollItem,a.Color,a.BatchNo,a.RollNo,a.ShipLength,a.InsptLenght,a
.InsptWidthB,a.InsptWidthM,a.InsptWidthE,a.InsptReslt,a.InsptReltPer,a.RecoredDate,a.TimeCheck,a.DateTimeCompleted,a.CreatedBy,b.RollLocation
				--,c.LabdipRemark Exception
				,b.RollNameID into #t55
				from #tinspt2 a
				left join InlineFBRollDataDtl
 b WITH(NOLOCK) on a.QrCode = b.RollNameID
				--left join Exception c WITH(NOLOCK) on c.MaterialCode = a.NewRollItem and CHARINDEX(c.Color,a.Color)>0 --and reverse(substring(reverse(a.Color),1,charindex(' ',reverse(a.Color)))) = reverse(substring(reverse
(c.Color),1,charindex(' ',reverse(c.Color)))) 
	
				SELECT DISTINCT a.*,b.Itemnumber2 Style
				FROM
				(select distinct a.InvoiceNo,a.SupCode,a.OrderNumber,a.RollItem,a.Color,a.BatchNo,a.RollNo
				,a.ShipLength,a.InsptLenght,a.InsptWidthB,a.InsptWidth
M,a.InsptWidthE,a.InsptReslt,a.InsptReltPer
				,a.RecoredDate,a.TimeCheck,a.DateTimeCompleted,a.CreatedBy,a.RollLocation
				--,Exception=STUFF((SELECT '-' + cast(Exception as nvarchar(1000))
				--FROM #t55 b
				--WHERE a.RollNameID = b.RollNameID
				
--FOR XML PATH (''))
				--, 1, 1, '')
				,a.RollNameID
				from #t55 a ) a
				LEFT JOIN dbo.InlineERPECCReqPOFirmHistory b
				ON a.OrderNumber = b.Purchaseorder AND LEFT(a.RollItem,8) = LEFT(b.Itemnumber,8)
				order by DateTimeCompleted

				drop tab
le #tinspt1,#tinspt2,#t55

			end

		if(@type=56)-- exec InlineAccGetLoadData 56,'POAD000007070','62773607-60','001A','38','42',''

			begin

				select distinct a.*,case when isnull(b.Itemnumber2,'') <> '' then b.Itemnumber2 else case when isnull(d.StyleNo,'') <> '' then d.StyleNo collate SQL_Latin1_General_CP1_CI_AS else '' end end Style,

				case when isnull(c.Customerrequisition,'') <> '' then c.Customerrequisition else case when isnull(d.OrderNo,'') <> '' then d.OrderNo collate SQL_Latin1_General_CP1_CI_AS else null end end OrderNo from

				(select * from InlineAccWHMaster WITH(NOLOCK) where PO =  @dt1 and matrcode = @dt2 and Color = @dt3 and OrdQty = @dt4 and sizx = @dt5) a

				inner join InlineERPECCReqPOFirmHistory b WITH(NOLOCK) on a.PO collate SQL_Latin1_General_CP1_CI_AS = b.Purchaseorder and 

				a.matrcode collate SQL_Latin1_General_CP1_CI_AS = b.Itemnumber and 

				a.Color collate SQL_Latin1_General_CP1_CI_AS = b.Color and 

				a.OrdQty = b.Purchasequantity and 

				a.sizx collate SQL_Latin1_General_CP1_CI_AS = b.Size

				left join InlineERPSalesOrders c WITH(NOLOCK) on b.Salesorder = c.Salesorder and b.CustomerPO = c.Customerreference

				left join SecurityReport.dbo.purvalc2 d WITH(NOLOCK) on a.sysid = d.SysId--a.matrcode = d.MatrCode and a.Color = d.Color and a.sizx = d.Sizx

			end

		else if(@type=57)-- exec InlineAccGetLoadData 57,'POAD000003780','62712096-60','043A','','',''

			begin

				select a.*,b.FoC_ExYrds Qty,b.Pass,b.Note,b.RollLocation Location from

				(select InvoiceNo,OrderNumber,RollItem,Color,BatchNo,RollNo,QrCode from InlineFBWHPkList WITH(NOLOCK) where OrderNumber = @dt1 and charindex(RollItem,@dt2) > 0 and charindex(@dt3,Color) > 0) a

				inner join InlineFBRollDataDtl b WITH(NOLOCK) on a.QrCode = b.RollNameID

				where b.OK = 0

			end

		else if(@type=58)-- exec InlineAccGetLoadData 58,'','','','','',''

			begin

				select * from InlineFBRollDataDtl WITH(NOLOCK) where RollNameID = @dt1

				select * from InlineFBWHPkList WITH(NOLOCK) where QrCode = @dt1

			end

		else if(@type=59)-- exec InlineAccGetLoadData 59,'aaaa','ABC','F2','','',''

			begin

				select QrCode into #tPk from InlineFBWHPkList where QrCode = @dt1

				exec sp_InlineFBUpdateNWFromTempTable @dt2,#tPk,@dt3

			end

		else if(@type=60)-- exec InlineAccGetLoadData 60,'','','','','',''

			begin

				select a.OrderNumber,a.RollItem,a.Color,a.RollNo,b.FoC_ExYrds Yds,b.Pass Status from

				(select * from InlineFBWHPkList WITH(NOLOCK) where QrCode = @dt1) a

				inner join InlineFBRollDataDtl b WITH(NOLOCK) on a.QrCode = b.RollNameID

			end

		else if(@type=61)-- exec InlineAccGetLoadData 61,'094','','','','',''

			begin

				select * from

				(select * from hr.dbo.staff WITH(NOLOCK) where id_staff like '%'+@dt1) a

				inner join hr.dbo.department b WITH(NOLOCK) on a.id_dept = b.id_dept

			end

		else if(@type=62)-- exec InlineAccGetLoadData 62,'A1A1926094','F2','','','',''

			begin

				select a.*,b.fullname,c.NameSick from

				(select * from InlineClinicEmployeeHisSick WITH(NOLOCK) where EmployeeCode = @dt1 and left(IdHisMed,2) = @dt2) a 

				inner join hr.dbo.staff b WITH(NOLOCK) on a.EmployeeCode = b.id_staff collate SQL_Latin1_General_CP1_CI_AS

				inner join InlineClinicSick c WITH(NOLOCK) on a.IdSick = c.IdSick

				order by a.SysCreateDate desc

			end

		else if(@type=63)-- exec InlineAccGetLoadData 63,'F2','','','','',''

			begin

				select b.IdGroup,b.NameGroup,a.IdMed,a.NameMed,sum(c.Qty - c.QtyIss) Qty from InlineClinicMedecine a WITH(NOLOCK) inner join 

				InlineClinicMedecineGroup b WITH(NOLOCK) on a.IdGroup = b.IdGroup

				inner join InlineClinicWHOfFac c WITH(NOLOCK) on a.IdMed = c.IdMed where c.Factory = @dt1 and c.QtyIss < c.Qty

				group by b.IdGroup,b.NameGroup,a.IdMed,a.NameMed



				select IdSick,NameSick from InlineClinicSick WITH(NOLOCK)

			end

		else if(@type=64)-- exec InlineAccGetLoadData 64,'F2','ME0007','','','',''

			BEGIN

				select * from InlineClinicWHOfFac WITH(NOLOCK) where Factory = @dt1 and IdMed = @dt2 and QtyIss < Qty

			end

		else if(@type=65)-- exec InlineAccGetLoadData 65,'POAD000007129','','','','',''

			begin

				select * from InlineERPTransactions_Main WITH(NOLOCK) where lower(Batchnumber) like lower('%'+@dt1)

			end

		else if(@type=66)-- exec InlineAccGetLoadData 66,'OPO25-0016939','','','','',''

			begin

				--select a.*,b.PickSize Pick from

				--(select a.*,b.Customerrequisition,a.Number+'+'+a.Itemnumber+'+'+a.Color+'+'+a.Size+'+'+cast(a.Quantity as varchar)+'+'+ItemGroup ID from

				--(select a.Serialnumber,a.Itemnumber,a.Physicaldate,a.Number,Quantity,a.Unit,case when a.Size = 'NO' then '' else a.Size end Size,case when a.Color = 'NO' then '' else a.Color end Color,a.ItemGroup,b.Salesorder,b.CustomerPO,b.Itemnumber2 from

				--(select Serialnumber,Itemnumber,Physicaldate,Batchnumber Number,sum(Quantity) Quantity,Unit,Size,Color,Invoice,ItemGroup from InlineERPTransactions_Main where lower(Batchnumber) like lower('%'+@dt1) and charindex('Purchase',Reference) > 0 group by S
erialnumber,Itemnumber,Physicaldate,Batchnumber,Unit,Size,Color,Invoice,ItemGroup) a

				--left join InlineERPECCReqPOFirmHistory b on a.Number = b.Purchaseorder

				--group by a.Serialnumber,a.Itemnumber,a.Physicaldate,a.Number,Quantity,a.Unit,a.Size,a.Color,a.ItemGroup,b.Salesorder,b.CustomerPO,b.Itemnumber2) a

				--left join InlineERPSalesOrders b on a.Salesorder = b.Salesorder and a.CustomerPO = b.Customerreference

				--group by a.Serialnumber,a.Itemnumber,a.Physicaldate,a.Number,a.Quantity,a.Unit,a.Size,a.Color,a.ItemGroup,a.Salesorder,a.CustomerPO,a.Itemnumber2,b.Customerrequisition,a.Number+'+'+a.Itemnumber+'+'+a.Color+'+'+a.Size+'+'+cast(a.Quantity as varchar)+
'+'+ItemGroup) a

				--left join InlineAccWHPickSize b on a.ID = b.ID



				select Serialnumber,Itemnumber,Physicaldate,Batchnumber Number,sum(Quantity) Quantity,Unit,Size,Color,Invoice,ItemGroup,Configuration

				into #t66_1 

				from InlineERPTransactions_Main WITH(NOLOCK) 

				where lower(RIGHT(Batchnumber,LEN(@dt1))) = lower(@dt1) and charindex('Purchase',Reference) > 0 

				group by Serialnumber,Itemnumber,Physicaldate,Batchnumber,Unit,Size,Color,Invoice,ItemGroup,Configuration



				select a.Serialnumber,a.Itemnumber,a.Physicaldate,a.Number,Quantity,a.Unit,

				case when a.Size = 'NO' then '' else a.Size end Size,

				case when a.Color = 'NO' then '' else a.Color end Color,

				a.ItemGroup,b.Salesorder,b.CustomerPO,b.Itemnumber2,a.Configuration 

				into #t66_2

				from #t66_1 a

				left join InlineERPECCReqPOFirmHistory b WITH(NOLOCK) on a.Number = b.Purchaseorder

				group by a.Serialnumber,a.Itemnumber,a.Physicaldate,a.Number,Quantity,a.Unit,a.Size,a.Color,a.ItemGroup,b.Salesorder,b.CustomerPO,b.Itemnumber2,a.Configuration 



				select a.*,b.Customerrequisition,a.Number+'+'+a.Itemnumber+'+'+a.Color+'+'+a.Size+'+'+cast(a.Quantity as varchar)+'+'+ItemGroup ID

				into #t66_3

				from #t66_2 a

				left join InlineERPSalesOrders b WITH(NOLOCK) on a.Salesorder = b.Salesorder and a.CustomerPO = b.Customerreference

				group by a.Serialnumber,a.Itemnumber,a.Physicaldate,a.Number,a.Quantity,a.Unit,a.Size,a.Color,a.ItemGroup,a.Salesorder,a.CustomerPO,a.Itemnumber2,a.Configuration,b.Customerrequisition,a.Number+'+'+a.Itemnumber+'+'+a.Color+'+'+a.Size+'+'+cast(a.Quantit
y as varchar)+'+'+ItemGroup



				select a.*,b.PickSize Pick,d.NAME Supp

				from #t66_3 a

				left join InlineAccWHPickSize b WITH(NOLOCK) on a.ID = b.ID

				LEFT JOIN (SELECT ACCOUNTNUM COLLATE DATABASE_DEFAULT AS ACCOUNTNUM, NAME COLLATE DATABASE_DEFAULT AS NAME FROM OPENQUERY([192.168.43.20], SELECT a.ACCOUNTNUM, b.NAME FROM AXDB.dbo.VENDTABLE a WITH (NOLOCK) LEFT JOIN AXDB.dbo.DIRPARTYTABLE b WITH (NOLOCK) ON a.PARTY = b.RECID)) d ON a.Configuration COLLATE DATABASE_DEFAULT = d.ACCOUNTNUM



				drop table #t66_1,#t66_2,#t66_3

			end

		else if(@type=67)-- exec InlineAccGetLoadData 67,'POAD000006514+80030900+043A/186C/001A/7482C/ADF4/08S1++1884+RHE','A1A1007485','F2','','',''

			begin

				declare @ex nvarchar(max);

				begin

					set @ex=(select distinct ID from InlineAccWHPickSize where ID = @dt1)

					if(@ex<>'')

						begin

							update InlineAccWHPickSize set PickSize = case when PickSize = '*' then '' else '*' end where ID = @dt1

						end

					else

						begin

							insert into InlineAccWHPickSize(ID,PickSize,CreatedBy,SysCreateDate)

							values(@dt1,'*',@dt2,getdate())

						end



					set @ex=(select distinct ID from InlineAccWHInspt where ID = @dt1)

					if(@ex<>'')

						begin

							update InlineAccWHInspt set Comment = @dt2 where ID = @dt1

							insert into InlineAccWHInspt(ID,CreatedBy,Factory)

							values(@dt1,@dt2,@dt3)

						end

					else

						begin

							insert into InlineAccWHInspt(ID,CreatedBy,Factory)

							values(@dt1,@dt2,@dt3)

						end

				end

			end

		else if(@type=68)-- exec InlineAccGetLoadData 68,'True','qcdailyreport','TR','20240516','20240516',''

			begin

				if(@dt1='True')

					begin

						if(@dt2='inventory')

							begin

								--select Itemnumber,Physicaldate,Number,sum(Quantity) Qty,Unit,case when Size = 'NO' then '' else Size end Size,case when Color = 'NO' then '' else Color end Color,ProductReceipt,ItemGroup 

								--from InlineERPTransactions_Main 

								--where charindex(@dt3,Warehouse) > 0 and Issue is null and (right(Physicaldate,4)+'-'+substring(Physicaldate,charindex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2)) between @dt4 and @dt5

								--group by Itemnumber,Physicaldate,Number,Unit,case when Size = 'NO' then '' else Size end,case when Color = 'NO' then '' else Color end,ProductReceipt,ItemGroup

								--order by right(Physicaldate,4)+'-'+substring(Physicaldate,charindex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2) desc



								--select Itemnumber,Physicaldate,Number,sum(Quantity) Qty,Unit,Size,Color,ProductReceipt,ItemGroup 

								--into #tempInventory1

								--from InlineERPTransactions_Main 

								--where charindex(@dt3,Warehouse) > 0 and Issue is null and (right(Physicaldate,4)+'-'+substring(Physicaldate,charindex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2)) > dateadd(month,-6,getdate())

								--group by Itemnumber,Physicaldate,Number,Unit,Size,Color,ProductReceipt,ItemGroup



								--select *

								--into #tempIn1

								--from

								--(select distinct a.Itemnumber,a.Physicaldate,a.Number,a.Qty,a.Unit,case when a.Size = 'NO' then '' else a.Size end Size,case when a.Color = 'NO' then '' else a.Color end Color,a.ProductReceipt,a.ItemGroup,b.Customerrequisition,b.Itemnumber Style
,b.Customerreference PONo

								--from #tempInventory1 a

								--left join InlineERPWHMaterialFull b on a.Number = b.InventBatchIdPO and a.Itemnumber = b.MaterialCode and a.Color = b.Color and a.Size = b.Size and a.ItemGroup = b.MatrClass) a

								--order by right(a.Physicaldate,4)+'-'+substring(a.Physicaldate,charindex('/',a.Physicaldate)+1,2)+'-'+left(a.Physicaldate,2) desc



								--drop table #tempInventory1



								--select a.*,b.Location

								--into #tempIn2

								--from #tempIn1 a

								--left join InlineAccWHLocHis b on a.Number = b.BatchNumber and a.Itemnumber = b.ItemNumber and a.Color = b.Color and a.Size = b.Size

								--where b.Comment is null



								--drop table #tempIn1



								--select a.Itemnumber,a.Physicaldate,a.Number,a.Qty,a.Unit,a.Size,a.Color,a.ProductReceipt,a.ItemGroup,a.Customerrequisition JobNo,a.Style,a.PONo,a.Location,case when b.Result = 'P' then 'PASS' else case when b.Result = 'F' then 'FAIL' else '' end
 end AQLIns,case when Metal = 1 then 'PASS' else case when Metal = 0 then 'FAIL' else '' end end MetalIns--,b.ID 

								--from #tempIn2 a

								--left join InlineAccWHInspt b on a.Number+'+'+a.Itemnumber+'+'+a.Color+'+'+a.Size+'+'+cast(a.Qty as varchar)+'+'+a.ItemGroup = b.ID

								--where b.Comment is null

								--order by right(a.Physicaldate,4)+'-'+substring(a.Physicaldate,charindex('/',a.Physicaldate)+1,2)+'-'+left(a.Physicaldate,2) desc



								--drop table #tempIn2



								--SELECT        Itemnumber, Physicaldate, Unit, Size, Color, Style, Batchnumber, ItemGroup, Qty, Warehouse

								--into #tempIn1

								--FROM            (SELECT        Itemnumber, Physicaldate, Unit, Size, Color, Style, Batchnumber, ItemGroup, ROUND(SUM(CAST(Quantity AS float)), 2) AS Qty, Warehouse

								--						  FROM            dbo.InlineERPTransactions_Main WITH(NOLOCK)

								--						  WHERE charindex(@dt3,Warehouse) > 0

								--						  GROUP BY Itemnumber, Physicaldate, Unit, Size, Color, Style, Batchnumber, ItemGroup, Warehouse) AS a

								--						  where Qty > 0



								--SELECT ITEMID Itemnumber,QTY Qty,UNITID Unit,

								--CASE WHEN INVENTSIZEID = 'NO' THEN '' ELSE INVENTSIZEID END Size,

								--CASE WHEN INVENTCOLORID = 'NO' THEN '' ELSE INVENTCOLORID END Color,

								--ITEMGROUPID ItemGroup,INVENTLOCATIONID Warehouse,INVENTSTYLEID Style,CONFIGID Configuration,INVENTBATCHID Batchnumber

								--into #tempIn1

								--FROM dbo.AA_ACC_Temp

								--WHERE INVENTLOCATIONID LIKE '%'+@dt3+'%'



								--SELECT ITEMID Itemnumber,PHYSICALINVENT Qty,CONFIGID Configuration,

								--CASE WHEN INVENTSIZEID = 'NO' THEN '' ELSE INVENTSIZEID END Size,

								--CASE WHEN INVENTCOLORID = 'NO' THEN '' ELSE INVENTCOLORID END Color,INVENTSTYLEID Style,INVENTBATCHID Batchnumber,INVENTLOCATIONID Warehouse

								--into #tempIn1

								--FROM [192.168.70.115].AXDB.dbo.INVENTSUM

								--WHERE INVENTLOCATIONID LIKE '%'+@dt3+'%' AND

								--PHYSICALINVENT > 0 



								--select distinct a.*,b.Location 

								--from #tempIn1 a

								--left join InlineAccWHLocHis b WITH(NOLOCK)

								--on a.Batchnumber COLLATE Chinese_Taiwan_Stroke_BIN = b.BatchNumber and a.Itemnumber COLLATE Chinese_Taiwan_Stroke_BIN= b.ItemNumber and case when a.Color = 'NO' then '' else a.Color END  COLLATE Chinese_Taiwan_Stroke_BIN = b.Color and case when 
a.Size = 'NO' then '' else a.Size END  COLLATE Chinese_Taiwan_Stroke_BIN = b.Size

								--AND b.Comment is NULL



								--DROP TABLE #tempIn1

								SELECT GETDATE()

							END

						else if(@dt2='qcdailyreport')

							begin

								--select Itemnumber,Physicaldate,Number,Size,Color,Qty,ItemGroup,Number+'+'+Itemnumber+'+'+Color+'+'+Size+'+'+cast(Qty as varchar)+'+'+ItemGroup ID

								--into #tempA

								--from

								--(select Itemnumber,Physicaldate,Number,sum(Quantity) Qty,case when Size = 'NO' then '' else Size end Size,case when Color = 'NO' then '' else Color end Color,ItemGroup

								--from InlineERPTransactions_Main WITH(NOLOCK)

								--where charindex(@dt3,Warehouse) > 0 

								--group by Itemnumber,Physicaldate,Number,Size,Color,ItemGroup) b



								--select distinct a.InsptDate,a.ID,a.CreatedBy,a.SysCreateDate,case when a.Metal = 1 then 'P' else case when a.Metal = 0 then 'F' else null end end Metal,

								--a.Result AQLInspt,a.Remark,e.Approval,isnull(e.Remark,'') RemarkApp,b.Number PO,b.ItemGroup MatrClass,b.Itemnumber MatrCode,b.Color,b.Size,b.Qty,d.Customerrequisition JobNo,c.Itemnumber2 Style,f.LabdipRemark Exception

								--from (select * from InlineAccWHInspt WITH(NOLOCK) where Factory = @dt3 and InsptDate between @dt4 and dateadd(day,1,@dt5) and Comment is null) a

								--inner join #tempA b on a.ID = b.ID

								--left join InlineERPECCReqPOFirmHistory c WITH(NOLOCK) on b.Number = c.Purchaseorder

								--left join InlineERPSalesOrders d WITH(NOLOCK) on c.Salesorder = d.Salesorder

								--left join InlineAccWHInsptApproval e WITH(NOLOCK) on a.ID = e.ID and isnull(d.Customerrequisition,'') = isnull(e.Job,'') and isnull(c.Itemnumber2,'') = isnull(e.Style,'') and e.Comment is null

								--left join Exception f WITH(NOLOCK) on charindex(f.MaterialCode,b.Itemnumber) > 0 and b.Color = f.Color and f.LabdipStatus like '%Release%'

								--order by b.Number



								--select Code,DefectEN,DefectVN from ADSDefectManager WITH(NOLOCK) where Defect = 10 order by cast(substring(Code,charindex('.',Code)+1,len(Code)) as int)



								SELECT a.*,SUM(b.Qty) QtyDefect

								INTO #Temp_Ins

								FROM

								(SELECT InsptDate,ID,CreatedBy,Remark,SysCreateDate

								,CASE WHEN ISNULL(Result,'') = 'P' THEN 'Pass' WHEN ISNULL(Result,'') = 'F' THEN 'Fail' ELSE '' END Result

								,Factory

								,CASE WHEN ISNULL(Metal,'') = '1' THEN 'Pass' ELSE 'Fail' END Metal

								FROM dbo.InlineAccWHInspt WITH(NOLOCK)

								WHERE Factory = @dt3 AND

								CAST(InsptDate AS DATE) >= @dt4 AND

								CAST(InsptDate AS DATE) <= @dt5 AND 

								Comment IS NULL) a

								LEFT JOIN dbo.InlineAccWHInsptDefct b WITH (NOLOCK)

								ON a.ID = b.ID

								GROUP BY a.InsptDate,a.ID,a.CreatedBy,a.Remark,a.SysCreateDate,a.Result,a.Metal,a.Factory



								SELECT Itemnumber,Physicaldate,Number,Size,Color,Qty,ItemGroup,Number+'+'+Itemnumber+'+'+Color+'+'+Size+'+'+cast(Qty as varchar)+'+'+ItemGroup ID

								INTO #Temp_PkList

								FROM

								(SELECT Itemnumber,Physicaldate,Number,sum(Quantity) Qty,case when Size = 'NO' then '' else Size end Size,case when Color = 'NO' then '' else Color end Color,ItemGroup

								FROM dbo.InlineERPTransactions_Main WITH (NOLOCK)

								WHERE Batchnumber IN (SELECT DISTINCT LEFT(ID,CHARINDEX('+',ID)-1) FROM #Temp_Ins) AND

								Reference LIKE '%Purchase%' AND

								Warehouse LIKE '%'+@dt3+'%'

								GROUP BY Itemnumber,Physicaldate,Number,Size,Color,ItemGroup) a



								SELECT distinct a.InsptDate,a.ID,a.CreatedBy,a.SysCreateDate,a.Metal,

								a.Result AQLInspt,a.Remark,e.Approval,isnull(e.Remark,'') RemarkApp,b.Number PO,b.ItemGroup MatrClass,b.Itemnumber MatrCode,b.Color,b.Size,b.Qty,ISNULL(a.QtyDefect,0) QtyDefect,d.Customerrequisition JobNo,c.Itemnumber2 Style

								FROM #Temp_Ins a

								INNER JOIN #Temp_PkList b

								ON a.ID = b.ID

								LEFT JOIN InlineERPECCReqPOFirmHistory c WITH(NOLOCK) ON b.Number = c.Purchaseorder

								LEFT JOIN InlineERPSalesOrders d WITH(NOLOCK) ON c.Salesorder = d.Salesorder

								LEFT JOIN InlineAccWHInsptApproval e WITH(NOLOCK) ON a.ID = e.ID and isnull(d.Customerrequisition,'') = isnull(e.Job,'') and isnull(c.Itemnumber2,'') = isnull(e.Style,'') and e.Comment is null

								--CHARINDEX(f.MaterialCode,b.Itemnumber) > 0 

								--AND b.Color = f.Color and f.LabdipStatus like '%Release%'

								order by b.Number



								DROP TABLE #Temp_Ins,#Temp_PkList



								select Code,DefectEN,DefectVN from ADSDefectManager WITH(NOLOCK) where Defect = 10 order by cast(substring(Code,charindex('.',Code)+1,len(Code)) as int)

							end

						else if(@dt2='location')-- exec InlineAccGetLoadData 68,'True','location','F2','','',''

							begin

								--select Itemnumber,Physicaldate,Batchnumber,sum(Quantity) Qty,Unit,case when Size = 'NO' then '' else Size end Size,case when Color = 'NO' then '' else Color end Color,ProductReceipt,ItemGroup,Warehouse,Style,Configuration 

								--into #tempLocPkList

								--from InlineERPTransactions_Main WITH(NOLOCK) 

								--where charindex(@dt3,Warehouse) > 0 AND /* Issue is null and Physicaldate >= dateadd(month,-8,getdate())*/ lower(Batchnumber) like '%'+lower(@dt6)+'%' and charindex('Purchase',Reference) > 0--(right(Physicaldate,4)+'-'+substring(Physicaldate,cha
rindex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2)) > dateadd(month,-8,getdate())

								--group by Itemnumber,Physicaldate,Batchnumber,Unit,Size,Color,ProductReceipt,ItemGroup,Warehouse,Style,Configuration



								--SELECT ITEMID Itemnumber,DATEPHYSICAL Physicaldate,QTY Qty,UNITID Unit,

								--CASE WHEN INVENTSIZEID = 'NO' THEN '' ELSE INVENTSIZEID END Size,

								--CASE WHEN INVENTCOLORID = 'NO' THEN '' ELSE INVENTCOLORID END Color,

								--ITEMGROUPID ItemGroup,INVENTLOCATIONID Warehouse,INVENTSTYLEID Style,CONFIGID Configuration,INVENTBATCHID Batchnumber

								--into #tempLocPkList

								--FROM dbo.AA_ACC_Temp1

								--WHERE INVENTLOCATIONID LIKE '%'+@dt3+'%'

								--SELECT b.Itemnumber,b.Physicaldate,SUM(b.Quantity) Qty,b.Unit,b.Configuration,

								--CASE WHEN b.Size = 'NO' THEN '' ELSE b.Size END Size,

								--CASE WHEN b.Color = 'NO' THEN '' ELSE b.Color END Color,b.Style,b.Warehouse,b.Batchnumber,b.ItemGroup

								--into #tempLocPkList

								--FROM

								--(SELECT DISTINCT ITEMID,CONFIGID,INVENTSIZEID,INVENTCOLORID,INVENTSTYLEID,INVENTBATCHID,INVENTLOCATIONID

								--FROM [192.168.70.115].AXDB.dbo.INVENTSUM

								--WHERE INVENTLOCATIONID LIKE '%'+@dt3+'%' AND

								--PHYSICALINVENT > 0) a

								--INNER JOIN dbo.InlineERPTransactions_Main b WITH (NOLOCK)

								--ON a.ITEMID COLLATE Chinese_Taiwan_Stroke_BIN = b.Itemnumber AND a.CONFIGID COLLATE Chinese_Taiwan_Stroke_BIN = b.Configuration AND a.INVENTSIZEID COLLATE Chinese_Taiwan_Stroke_BIN = b.Size AND a.INVENTCOLORID COLLATE Chinese_Taiwan_Stroke_BIN =
 b.Color AND a.INVENTSTYLEID COLLATE Chinese_Taiwan_Stroke_BIN = b.Style AND a.INVENTBATCHID COLLATE Chinese_Taiwan_Stroke_BIN = b.Batchnumber AND a.INVENTLOCATIONID COLLATE Chinese_Taiwan_Stroke_BIN = b.Warehouse

								--WHERE b.Issue = 'None'

								--GROUP BY b.Itemnumber,b.Physicaldate,b.Unit,b.Configuration,

								--CASE WHEN b.Size = 'NO' THEN '' ELSE b.Size END,

								--CASE WHEN b.Color = 'NO' THEN '' ELSE b.Color END,b.Style,b.Warehouse,b.Batchnumber,b.ItemGroup



								--select distinct a.*,b.Location,c.Name

								--from #tempLocPkList a

								--left join InlineAccWHLocHis b WITH(NOLOCK) on a.Batchnumber COLLATE Chinese_Taiwan_Stroke_BIN = b.BatchNumber and a.Itemnumber COLLATE Chinese_Taiwan_Stroke_BIN = b.ItemNumber and a.Color COLLATE Chinese_Taiwan_Stroke_BIN = b.Color and a.Size  C
OLLATE Chinese_Taiwan_Stroke_BIN= b.Size /*and a.Qty = b.Qty*/ and Comment is NULL

								--LEFT JOIN dbo.InlineERPVendor_Main c WITH (NOLOCK) ON a.Configuration COLLATE Chinese_Taiwan_Stroke_BIN = c.Vendoraccount

								--order by Physicaldate desc--right(Physicaldate,4)+'-'+substring(Physicaldate,charindex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2) desc



								--drop table #tempLocPkList



								--select distinct b.Itemnumber,b.Physicaldate,b.Batchnumber,/*sum(Quantity)*/a.Qty Qty,Unit,case when b.Size = 'NO' then '' else b.Size end Size,case when b.Color = 'NO' then '' else b.Color end Color,b.ProductReceipt,b.ItemGroup,b.Warehouse,b.Sty
le,a.Location

								--from

								--(select * from InlineAccWHLocHis where Comment is null and Factory = 'F2' and BatchNumber like '%'+lower(@dt6)+'%') a

								--inner join InlineERPTransactions_Main b

								--on a.BatchNumber = b.Batchnumber and a.ItemNumber = b.Itemnumber and a.Color = case when b.Color = 'NO' then '' else b.Color end and a.Size = case when b.Size = 'NO' then '' else b.Size end and charindex('Purchase',b.Reference) > 0

								SELECT GETDATE()

							END

					end

				else 

					begin

						if(@dt2='inventory')

							begin

								--select Itemnumber,Physicaldate,Number,sum(Quantity) Qty,Unit,case when Size = 'NO' then '' else Size end Size,case when Color = 'NO' then '' else Color end Color,ProductReceipt,ItemGroup 

								--from InlineERPTransactions_Main 

								--where charindex(@dt3,Warehouse) > 0 and Issue is null

								--group by Itemnumber,Physicaldate,Number,Unit,case when Size = 'NO' then '' else Size end,case when Color = 'NO' then '' else Color end,ProductReceipt,ItemGroup

								--order by right(Physicaldate,4)+'-'+substring(Physicaldate,charindex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2) desc



								--select Itemnumber,Physicaldate,Number,sum(Quantity) Qty,Unit,Size,Color,ProductReceipt,ItemGroup 

								--into #tempInventory2

								--from InlineERPTransactions_Main 

								--where charindex(@dt3,Warehouse) > 0 and Issue is null and (right(Physicaldate,4)+'-'+substring(Physicaldate,charindex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2)) > dateadd(month,-6,getdate())

								--group by Itemnumber,Physicaldate,Number,Unit,Size,Color,ProductReceipt,ItemGroup



								--select *

								--into #tempIn11

								--from

								--(select distinct a.Itemnumber,a.Physicaldate,a.Number,a.Qty,a.Unit,case when a.Size = 'NO' then '' else a.Size end Size,case when a.Color = 'NO' then '' else a.Color end Color,a.ProductReceipt,a.ItemGroup,b.Customerrequisition,b.Itemnumber Style
,b.Customerreference PONo

								--from #tempInventory2 a

								--left join InlineERPWHMaterialFull b on a.Number = b.InventBatchIdPO and a.Itemnumber = b.MaterialCode and a.Color = b.Color and a.Size = b.Size and a.ItemGroup = b.MatrClass) a

								--order by right(a.Physicaldate,4)+'-'+substring(a.Physicaldate,charindex('/',a.Physicaldate)+1,2)+'-'+left(a.Physicaldate,2) desc



								--drop table #tempInventory2



								--select a.*,b.Location

								--into #tempIn22

								--from #tempIn11 a

								--left join InlineAccWHLocHis b on a.Number = b.BatchNumber and a.Itemnumber = b.ItemNumber and a.Color = b.Color and a.Size = b.Size

								--where b.Comment is null



								--drop table #tempIn11



								--select a.Itemnumber,a.Physicaldate,a.Number,a.Qty,a.Unit,a.Size,a.Color,a.ProductReceipt,a.ItemGroup,a.Customerrequisition JobNo,a.Style,a.PONo,a.Location,case when b.Result = 'P' then 'PASS' else case when b.Result = 'F' then 'FAIL' else '' end
 end AQLIns,case when Metal = 1 then 'PASS' else case when Metal = 0 then 'FAIL' else '' end end MetalIns--,b.ID 

								--from #tempIn22 a

								--left join InlineAccWHInspt b on a.Number+'+'+a.Itemnumber+'+'+a.Color+'+'+a.Size+'+'+cast(a.Qty as varchar)+'+'+a.ItemGroup = b.ID

								--where b.Comment is null

								--order by right(a.Physicaldate,4)+'-'+substring(a.Physicaldate,charindex('/',a.Physicaldate)+1,2)+'-'+left(a.Physicaldate,2) desc



								--drop table #tempIn22

								--SELECT ITEMID Itemnumber,QTY Qty,UNITID Unit,

								--CASE WHEN INVENTSIZEID = 'NO' THEN '' ELSE INVENTSIZEID END Size,

								--CASE WHEN INVENTCOLORID = 'NO' THEN '' ELSE INVENTCOLORID END Color,

								--ITEMGROUPID ItemGroup,INVENTLOCATIONID Warehouse,INVENTSTYLEID Style,CONFIGID Configuration,INVENTBATCHID Batchnumber

								--into #tempIn11

								--FROM dbo.AA_ACC_Temp

								--WHERE INVENTLOCATIONID LIKE '%'+@dt3+'%'



								--SELECT ITEMID Itemnumber,PHYSICALINVENT Qty,CONFIGID Configuration,

								--CASE WHEN INVENTSIZEID = 'NO' THEN '' ELSE INVENTSIZEID END Size,

								--CASE WHEN INVENTCOLORID = 'NO' THEN '' ELSE INVENTCOLORID END Color,INVENTSTYLEID Style,INVENTBATCHID Batchnumber,INVENTLOCATIONID Warehouse

								--into #tempIn11

								--FROM [192.168.70.115].AXDB.dbo.INVENTSUM

								--WHERE INVENTLOCATIONID LIKE '%'+@dt3+'%' AND

								--PHYSICALINVENT > 0 



								--select distinct a.*,b.Location 

								--from #tempIn11 a

								--left join InlineAccWHLocHis b WITH(NOLOCK)

								--on /*a.Batchnumber = b.BatchNumber and*/ a.Itemnumber COLLATE Chinese_Taiwan_Stroke_BIN= b.ItemNumber and case when a.Color = 'NO' then '' else a.Color END  COLLATE Chinese_Taiwan_Stroke_BIN = b.Color and case when a.Size = 'NO' then '' else a.S
ize END  COLLATE Chinese_Taiwan_Stroke_BIN = b.Size

								--AND b.Comment is NULL

								SELECT GETDATE()

							end

						else if(@dt2='qcdailyreport')

							begin

								SELECT a.*,SUM(b.Qty) QtyDefect

								INTO #Temp_Ins1

								FROM

								(SELECT InsptDate,ID,CreatedBy,Remark,SysCreateDate

								,CASE WHEN ISNULL(Result,'') = 'P' THEN 'Pass' WHEN ISNULL(Result,'') = 'F' THEN 'Fail' ELSE '' END Result

								,Factory

								,CASE WHEN ISNULL(Metal,'') = '1' THEN 'Pass' ELSE 'Fail' END Metal

								FROM dbo.InlineAccWHInspt WITH(NOLOCK)

								WHERE Factory = @dt3 AND

								CAST(InsptDate AS DATE) >= @dt4 AND

								CAST(InsptDate AS DATE) <= @dt5 AND 

								Comment IS NULL) a

								LEFT JOIN dbo.InlineAccWHInsptDefct b WITH (NOLOCK)

								ON a.ID = b.ID

								GROUP BY a.InsptDate,a.ID,a.CreatedBy,a.Remark,a.SysCreateDate,a.Result,a.Metal,a.Factory



								SELECT Itemnumber,Physicaldate,Number,Size,Color,Qty,ItemGroup,Number+'+'+Itemnumber+'+'+Color+'+'+Size+'+'+cast(Qty as varchar)+'+'+ItemGroup ID

								INTO #Temp_PkList1

								FROM

								(SELECT Itemnumber,Physicaldate,Number,sum(Quantity) Qty,case when Size = 'NO' then '' else Size end Size,case when Color = 'NO' then '' else Color end Color,ItemGroup

								FROM dbo.InlineERPTransactions_Main WITH (NOLOCK)

								WHERE Batchnumber IN (SELECT DISTINCT LEFT(ID,CHARINDEX('+',ID)-1) FROM #Temp_Ins1) AND

								Reference LIKE '%Purchase%' AND

								Warehouse LIKE '%'+@dt3+'%'

								GROUP BY Itemnumber,Physicaldate,Number,Size,Color,ItemGroup) a



								SELECT distinct a.InsptDate,a.ID,a.CreatedBy,a.SysCreateDate,a.Metal,

								a.Result AQLInspt,a.Remark,e.Approval,isnull(e.Remark,'') RemarkApp,b.Number PO,b.ItemGroup MatrClass,b.Itemnumber MatrCode,b.Color,b.Size,b.Qty,a.QtyDefect,d.Customerrequisition JobNo,c.Itemnumber2 Style

								FROM #Temp_Ins1 a

								INNER JOIN #Temp_PkList1 b

								ON a.ID = b.ID

								LEFT JOIN InlineERPECCReqPOFirmHistory c WITH(NOLOCK) ON b.Number = c.Purchaseorder

								LEFT JOIN InlineERPSalesOrders d WITH(NOLOCK) ON c.Salesorder = d.Salesorder

								LEFT JOIN InlineAccWHInsptApproval e WITH(NOLOCK) ON a.ID = e.ID and isnull(d.Customerrequisition,'') = isnull(e.Job,'') and isnull(c.Itemnumber2,'') = isnull(e.Style,'') and e.Comment is null

								order by b.Number



								DROP TABLE #Temp_Ins1,#Temp_PkList1



								select Code,DefectEN,DefectVN from ADSDefectManager WITH(NOLOCK) where Defect = 10 order by cast(substring(Code,charindex('.',Code)+1,len(Code)) as int)

							end

						else if(@dt2='location')-- exec InlineAccGetLoadData 68,'Fail','location','F2','','',''

							begin

								select Itemnumber,Physicaldate,Batchnumber,sum(Quantity) Qty,Unit,case when Size = 'NO' then '' else Size end Size,case when Color = 'NO' then '' else Color end Color,ProductReceipt,ItemGroup,Warehouse,Style 

								into #tempLocPkList1

								from InlineERPTransactions_Main WITH(NOLOCK) 

								where charindex(@dt3,Warehouse) > 0 and /*Issue is null and Physicaldate >= dateadd(month,-8,getdate())*/lower(Batchnumber) like '%'+lower(@dt6)+'%' and charindex('Purchase',Reference) > 0--(right(Physicaldate,4)+'-'+substring(Physicaldate,charind
ex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2)) > dateadd(month,-8,getdate())

								group by Itemnumber,Physicaldate,Batchnumber,Unit,Size,Color,ProductReceipt,ItemGroup,Warehouse,Style



								select a.*,b.Location

								into #tempPkList2

								from #tempLocPkList1 a WITH(NOLOCK)

								left join InlineAccWHLocHis b WITH(NOLOCK) on a.Batchnumber = b.BatchNumber and a.Itemnumber = b.ItemNumber and a.Color = b.Color and a.Size = b.Size /*and a.Qty = b.Qty*/ and Comment is null 

								--order by right(Physicaldate,4)+'-'+substring(Physicaldate,charindex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2) desc



								select distinct a.*,b.Customerrequisition JobNumber,b.Itemnumber Style,b.Customerreference PONo,a.Batchnumber+'+'+a.Itemnumber+'+'+a.Color+'+'+a.Size+'+'+cast(a.Qty as varchar)+'+'+a.ItemGroup ID

								from #tempPkList2 a

								left join InlineERPWHMaterialFull b WITH(NOLOCK) on a.Batchnumber = b.InventBatchIdPO and a.Itemnumber = b.MaterialCode and a.Color = b.Color and a.Size = b.Size

								order by a.Physicaldate desc--right(a.Physicaldate,4)+'-'+substring(a.Physicaldate,charindex('/',a.Physicaldate)+1,2)+'-'+left(a.Physicaldate,2) desc



								drop table #tempLocPkList1,#tempPkList2



								--Number+'+'+Itemnumber+'+'+Color+'+'+Size+'+'+cast(Qty as varchar)+'+'+ItemGroup ID

							end

					end

			end

		else if(@type = 69)-- exec InlineAccGetLoadData 69,'','','','','',''

			begin

				select ',ID,InsptDate,SysCreateDate'

			end

		else if(@type=70)-- exec InlineAccGetLoadData 70,'','','','','',''

			begin

				declare @d int;

				set @d=(select count(*) from InlineAccWHInsptApproval where ID = @dt3 and Job = @dt1)

				if(@d>0)

					begin

						update InlineAccWHInsptApproval set Comment = @dt6 where RecNo = (select RecNo from InlineAccWHInsptApproval where Job = @dt1 and ID = @dt3 and Comment is null)

						insert into InlineAccWHInsptApproval values (@dt1,@dt2,@dt3,null,@dt4,@dt5,@dt6,getdate())

					end

				else

					begin

						insert into InlineAccWHInsptApproval values (@dt1,@dt2,@dt3,null,@dt4,@dt5,@dt6,getdate())

					end

			end

		else if(@type=71)-- exec InlineAccGetLoadData 71,'611522AA-ADPGAD2202A/0393PA80023713A2QN/960340505','','','','',''

			begin

				select a.ID,a.Code,b.DefectEN,b.DefectVN,a.Qty,a.Image from

				(select * from InlineAccWHInsptDefct WITH(NOLOCK) where ID = @dt1) a

				inner join ADSDefectManager b WITH(NOLOCK) on a.Code = b.Code

			end

		else if(@type=72)-- exec InlineAccGetLoadData 72,'','','','','',''

			begin

				select * from ADSDefectManager WITH(NOLOCK) where Defect = 10

				select * from AQLLevel WITH(NOLOCK) where Dept = 'Accessary'

			end

		else if(@type=73)-- exec InlineAccGetLoadData 73,'','','','','',''

			begin

				declare @dem int;

					begin

						set @dem=(select count(ID) from InlineAccWHInspt where ID = @dt1)

						if(@dem>0)

							begin

								update InlineAccWHInspt set Comment = @dt2,SysCreateDate=getdate() where ID = @dt1



								insert into InlineAccWHInspt(InsptDate,ID,CreatedBy,Result,Factory,Metal)

								values (getdate(),@dt1,@dt2,'P',@dt3,1)

							end

						else

							begin

								insert into InlineAccWHInspt(InsptDate,ID,CreatedBy,Result,Factory,Metal)

								values (getdate(),@dt1,@dt2,'P',@dt3,1)

							end

					end

			end

		else if(@type=74)-- exec InlineAccGetLoadData 74,'','','','','',''

			begin

				declare @dm int;

					begin

						set @dm=(select count(ID) from InlineAccWHPickSize where ID = @dt1)

						if(@dm>0)

							begin

								update InlineAccWHPickSize set PickSize = '*',SysCreateDate=getdate() where ID = @dt1

							end

						else

							begin

								insert into InlineAccWHPickSize(ID,PickSize,CreatedBy,SysCreateDate)

								values (@dt1,'*',@dt2,getdate())

							end

					end

			end

		else if(@type=75)-- exec InlineAccGetLoadData 75,'InlineAccWH_Temp_UploadPick_20220930141416','Shieu','','','',''

			begin

				declare @sqll nvarchar(max);

				begin

					set @sqll='declare @dd int;

					begin

						set @dd = (select count(ID) from (select distinct ID from InlineAccWHInsptApproval where ID in (select distinct ID from '+quotename(@dt1)+')) a) 

						if(@dd>0)

							begin

								update InlineAccWHInsptApproval set Comment = '''+@dt2+''' where ID in (select distinct ID from '+quotename(@dt1)+')

								insert into InlineAccWHInsptApproval(Job,Style,ID,CreatedBy,Approval,SysCreateDate) select Job,Style,ID,'''+@dt2+''','''+@dt3+''',getdate() from '+quotename(@dt1)+' 

							end

						else

							begin

								insert into InlineAccWHInsptApproval(Job,Style,ID,CreatedBy,Approval,SysCreateDate) select Job,Style,ID,'''+@dt2+''','''+@dt3+''',getdate() from '+quotename(@dt1)+'

							end



						drop table '+quotename(@dt1)+'

					end'

				end

				execute sp_executesql @sqll

			end

		else if(@type=76)-- exec InlineAccGetLoadData 76,'InlineAccWH_Temp_UploadPick_20220930141416','Shieu','','','',''

			begin

				declare @sql2 nvarchar(max);

				begin

					set @sql2='declare @dem int;

					begin

						set @dem = (select * from InlineAccWHInsptDefct where ID in (select ID from '+quotename(@dt1)+') and Code = '''+@dt2+''')

						if(@dem>0)

							begin



							end

						else

							begin

								insert into InlineAccWHInsptDefct(ID,Code,Qty,Image,CreatedBy,SysCreateDate)

								select ID,'''+@dt2+''','''+@dt3+''','''+@dt4+''','''+@dt5+''',getdate() from '''+quotename(@dt1)+''' 

							end

						drop table '''+quotename(@dt1)+''' 

					end'

				end

				execute sp_executesql @sql2

			end

		else if(@type=77)-- exec InlineAccGetLoadData 77,'20221029','20221029','F2','','',''

			begin

				select *,Number+'+'+Itemnumber+'+'+Color+'+'+Size+'+'+cast(Quantity as nvarchar)+'+'+ItemGroup ID 

				into #PkList

				from 

				(select Physicaldate,Number,Itemnumber,case when Color = 'NO' then '' else Color end Color,case when Size = 'NO' then '' else Size end Size,ItemGroup,b.Name Configuration,round(sum(cast(Quantity as float)),0) Quantity

				from InlineERPTransactions_Main a WITH(NOLOCK)

				left join InlineERPVendor_Main b WITH(NOLOCK) on a.Configuration = b.Vendoraccount

				where --(right(Physicaldate,4)+'-'+substring(Physicaldate,charindex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2)) >= dateadd(month,-6,getdate())-- and Number like '%9130'

                Physicaldate >= dateadd(month,-2,getdate())

				group by Physicaldate,Number,Itemnumber,case when Color = 'NO' then '' else Color end,case when Size = 'NO' then '' else Size end,ItemGroup,b.Name) a



				select a.Number,a.Itemnumber,Configuration,a.Color,a.Size,a.Quantity,a.ItemGroup,b.Metal,b.ID,b.Customer

				into #t11

				from #PkList a 

				inner join InlineAccWHInspt b WITH(NOLOCK) on /*(a.Number+'+'+a.Itemnumber+'+'+a.Color+'+'+a.Size+'+'+cast(a.Quantity as varchar)+'+'+ItemGroup)*/a.ID = b.ID

				where convert(varchar(8),b.InsptDate,112) between @dt1 and @dt2 and b.Comment is null and b.Factory = @dt3--convert(varchar(8),b.InsptDate,112) >= @dt1 and convert(varchar(8),b.InsptDate,112) <= @dt2 and b.Factory = @dt3 and b.Comment is null

				group by a.Number,a.Itemnumber,Configuration,a.Color,a.Size,a.Quantity,a.ItemGroup,b.Metal,b.ID,b.Customer



				select a.Number,a.Itemnumber,a.Configuration,a.Color,a.Size,a.Quantity,a.ItemGroup,a.ID,b.Salesorder,b.CustomerPO,b.Itemnumber2,a.Metal,a.Customer

				into #t22

				from #t11 a

				left join InlineERPECCReqPOFirmHistory b WITH(NOLOCK) on a.Number = b.Purchaseorder and a.Itemnumber = b.Itemnumber and a.Color = case when b.Color = 'NO' then '' else b.Color end and a.Size = case when b.Size = 'NO' then '' else b.Size end

				group by a.Number,a.Itemnumber,a.Configuration,a.Color,a.Size,a.Quantity,a.ItemGroup,a.ID,b.Salesorder,b.CustomerPO,b.Itemnumber2,a.Metal,a.Customer



				select b.Customerrequisition,a.Itemnumber2,a.Configuration,a.ItemGroup+':'+a.Itemnumber Item,a.Number,a.Color,a.Metal,

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.1') as '61',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.2') as '62',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.3') as '63',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.4') as '64',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.5') as '65',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.6') as '66',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.7') as '67',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.8') as '68',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.9') as '69',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.10') as '610',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.11') as '611',

				(select sum(Qty) from InlineAccWHInsptDefct WITH(NOLOCK) where ID = a.ID and Code = '6.12') as '612',

				a.Quantity,a.ID,a.Customer

				into #t33

				from #t22 a

				left join InlineERPSalesOrders b WITH(NOLOCK) on a.Salesorder = b.Salesorder



				select a.Customerrequisition,a.Itemnumber2,a.Configuration,a.Item,a.Number,a.Color,a.Metal,a.[61],a.[62],a.[63],a.[64],a.[65],a.[66],a.[67],a.[68],a.[69],a.[610],a.[611],a.[612],/*sum(a.Quantity)*/ Quantity,b.Approval,a.Customer

				into #t44

				from #t33 a

				left join InlineAccWHInsptApproval b WITH(NOLOCK) on a.ID = b.ID where b.Comment is null

				group by a.Customerrequisition,a.Itemnumber2,a.Configuration,a.Item,a.Number,a.Color,a.Metal,a.[61],a.[62],a.[63],a.[64],a.[65],a.[66],a.[67],a.[68],a.[69],a.[610],a.[611],a.[612],Quantity,b.Approval,a.Customer 



				select a.Customerrequisition,a.Itemnumber2,a.Configuration,a.Item,a.Number,a.Color,case when a.Metal = '1' then 'PASS' else case when a.Metal = '0' then 'FAIL' else '' end end Metal,a.[61],a.[62],a.[63],a.[64],a.[65],a.[66],a.[67],a.[68],a.[69],a.[610
],a.[611],a.[612],a.Quantity,

				case when a.Quantity < 8 then a.Quantity else (select SampleSize from AQLLevel WITH(NOLOCK) where Dept = 'Accessary' AND Customer = a.Customer and LoadSize1 <= a.Quantity and isnull(LoadSize2,100000000) >= a.Quantity) end as 'AQL',

				case when a.Approval = 'P' then 'PASS' else case when a.Approval = 'F' then 'FAIL' else '' end end Approval into #cho1 from #t44 a

				order by a.Number



				select *,ROW_NUMBER() over (partition by Configuration,Item,Number,Color order by Number) Num into #cho2 from #cho1

				update #cho2 set [61] = NULL,[62] = NULL,[63] = NULL,[64] = NULL,[65] = NULL,[66] = NULL,[67] = NULL,[68] = NULL,[69] = NULL,[610] = NULL,[611] = NULL,[612] = NULL,Quantity = NULL,

									AQL = NULL where Num > 1

				alter table #cho2 drop column Num

				select * from #cho2

			end	--- exec InlineAccGetLoadData 77,'20230911','20230911','F2','','',''

		else if(@type=78)-- exec InlineAccGetLoadData 78,'20221011','20221011','F2','','',''

			begin

				declare @sql3 nvarchar(max);

				begin

					set @sql3 = 'update InlineAccWHInspt set Comment = '''+@dt2+''' where ID in (select * from '+quotename(@dt1)+') drop table '+quotename(@dt1)

				end

				execute sp_executesql @sql3

			end

		else if(@type=79)-- exec InlineAccGetLoadData 79,'F2','','','','',''

			begin

				--select Id,DateNeed,FacLine,JobNo,ColorCode,Size,PONo,ReqQty from InlineQcKanban where left(FacLine,2) = @dt1 and DateNeed >= dateadd(day,-30,getdate()) order by DateNeed desc

				select a.JobNo,a.ColorCode,a.PONo,b.Order_Qty from

				(select distinct Customerrequisition JobNo,case when GarmentColor = 'NO' then '' else GarmentColor end ColorCode,Customerreference PONo,Salesorder 

				from InlineERPWHMaterialFull WITH(NOLOCK) 

				where DeliveryDate > dateadd(day,-30,getdate()) and Buyergroup = 'AD') a

				inner join A1AF1Plan b WITH(NOLOCK) on a.Salesorder = b.Job_No and a.ColorCode = b.Color

				order by a.JobNo desc

			end

		else if(@type=80)-- exec InlineAccGetLoadData 80,'''AA2211/00454''','''IB7461'',''IB7461'',''IB7461'',''IB7461'',''IB7461'',''IB7461''','Customerreference in (''0131400347'',''TEST 4.61'',''0131534086'',''TEST SHIPMENT'',''0131581442'',''0131585282'') '
,'charindex(''0131400347'',PONO) > 0 and charindex(''TEST 4.61'',PONO) > 0 and charindex(''0131534086'',PONO) > 0 and charindex(''TEST SHIPMENT'',PONO) > 0 and charindex(''0131581442'',PONO) > 0 and charindex(''0131585282'',PONO) > 0 ','',''

			begin

				declare @n	varchar(max)

					set @n = 'select Customerrequisition,Customerreference,Itemnumber,GarmentColor,MatrClass,MaterialCode,MaterialName,BomConfigId,Color,ColorName,Size,RMStyle,ReserveQty,UnitOfRM,InventBatchIdPO,SuppCode,Warehouse 

					into #n1

					from InlineERPWHMaterialFull where Customerrequisition = '''+@dt1+''' and GarmentColor in ('+@dt2+') and '+@dt3+' and ReserveQty > 0

					group by Customerrequisition,Customerreference,Itemnumber,GarmentColor,MatrClass,MaterialCode,MaterialName,BomConfigId,Color,ColorName,Size,RMStyle,ReserveQty,UnitOfRM,InventBatchIdPO,SuppCode,Warehouse



					select Sub_No,sum(Order_Qty) OrdQty 

					into #n2

					from A1AF1Plan 

					where Sub_No = '''+@dt1+''' and Color in ('+@dt2+') and ('+@dt4+')

					group by Sub_No



					select distinct a.Customerrequisition,a.Customerreference,a.Itemnumber,a.GarmentColor,a.MatrClass,a.MaterialCode,a.MaterialName,a.BomConfigId,a.Color,a.ColorName,a.Size,

					a.RMStyle,a.ReserveQty,a.UnitOfRM,a.InventBatchIdPO,a.SuppCode,Warehouse,b.OrdQty,round(a.ReserveQty/b.OrdQty,5) Cons

					into #n3

					from #n1 a inner join #n2 b on a.Customerrequisition = b.Sub_No



					select Customerrequisition,MatrClass,MaterialCode,MaterialName,Color,Size,RMStyle,UnitOfRM,InventBatchIdPO,SuppCode,Warehouse,round(sum(ReserveQty),2) SumReserve from #n3

					group by Customerrequisition,MatrClass,MaterialCode,MaterialName,Color,Size,RMStyle,UnitOfRM,InventBatchIdPO,SuppCode,Warehouse



					select Customerrequisition,Customerreference,Itemnumber,GarmentColor,MatrClass,MaterialCode,MaterialName,BomConfigId,Color,ColorName,Size,

					RMStyle,ReserveQty,UnitOfRM,InventBatchIdPO,SuppCode,Warehouse,OrdQty,Cons,MaterialCode+'':''+BomConfigId+'':''+Size+'':''+Color+'':''+RMStyle+'':''+InventBatchIdPO ID 

					from #n3



					drop table #n1,#n2,#n3'

					exec (@n)

			end

		else if(@type=81)-- exec InlineAccGetLoadData 81,'','','','','',''

			begin

				set @sql = 'insert into InlineAccWHIssue(FacLine,Job,ID,ReserveQty,Qty,CreatedBy,SysCreateDate,IDKB,PONo) '+

				'select '''+@dt2+''','''+@dt3+''',ID,ReserveQty,Qty,'''+@dt4+''',getdate(),'''+@dt5+''','''+@dt6+''' from '+quotename(@dt1)

			end

		else if(@type=82)-- exec InlineAccGetLoadData 82,'F2','','','','',''

			begin

				select Batchnumber,Itemnumber,Color,Size,cast(replace(cast(Quantity as varchar),'-','') as float) Quantity,JobNumber,Customerreference PONo,Configuration--,Number+'+'+Itemnumber+'+'+Color+'+'+Size+'+'+cast(Quantity as nvarchar)+'+'+ItemGroup ID 

				into #PkList1

				from 

				(select *

				from InlineERPTransactions_Main a WITH(NOLOCK)

				left join InlineERPVendor_Main b WITH(NOLOCK) on a.Configuration = b.Vendoraccount

				where charindex(@dt1,Location) > 0 and Issue is not null and Reference = 'Production line') a



				select distinct a.*,b.Itemnumber Style

				from #PkList1 a

				left join InlineERPWHMaterialFull b WITH(NOLOCK) on a.JobNumber = b.Customerrequisition and a.PONo = b.Customerreference



				drop table #PkList1

			end

		else if(@type=83)-- exec InlineAccGetLoadData 83,'F1','20230801','20230831','','',''

			begin

				select *,Number+'+'+Itemnumber+'+'+Color+'+'+Size+'+'+cast(Quantity as nvarchar)+'+'+ItemGroup ID 

				into #PkList11

				from 

				(select Physicaldate,Number,Itemnumber,case when Color = 'NO' then '' else Color end Color,case when Size = 'NO' then '' else Size end Size,ItemGroup,b.Name Configuration,round(sum(cast(Quantity as float)),0) Quantity

				from InlineERPTransactions_Main a WITH(NOLOCK)

				left join InlineERPVendor_Main b WITH(NOLOCK) on a.Configuration = b.Vendoraccount

				where /*(right(Physicaldate,4)+'-'+substring(Physicaldate,charindex('/',Physicaldate)+1,2)+'-'+left(Physicaldate,2))*/a.Physicaldate >= dateadd(month,-6,getdate())-- and Number like '%9130'

				group by Physicaldate,Number,Itemnumber,case when Color = 'NO' then '' else Color end,case when Size = 'NO' then '' else Size end,ItemGroup,b.Name) a



				select distinct Physicaldate,Configuration,b.ItemGroup+':'+ Itemnumber Item,Number,Quantity,Quantity QtyCheck,Color,c.Qty,d.Code +' '+d.DefectVN Defect,c.Image from

				(select * from InlineAccWHInspt WITH(NOLOCK) where Factory = @dt1 and convert(varchar(8),InsptDate,112) between @dt2 and @dt3) a

				inner join #PkList11 b on a.ID = b.ID

				left join InlineAccWHInsptDefct c WITH(NOLOCK) on a.ID = c.ID

				left join ADSDefectManager d WITH(NOLOCK) on c.Code = d.Code

				order by Number

			end

		else if(@type=84) -- Performance Acc

			begin

				/*--Data Inspection [0]

				select Itemnumber,Physicaldate,Number,Size,Color,Qty,ItemGroup,Number+'+'+Itemnumber+'+'+Color+'+'+Size+'+'+cast(Qty as varchar)+'+'+ItemGroup ID

				into #tempPerA

				from

				(select Itemnumber,Physicaldate,Number,sum(Quantity) Qty,case when Size = 'NO' then '' else Size end Size,case when Color = 'NO' then '' else Color end Color,ItemGroup

				from InlineERPTransactions_Main WITH(NOLOCK)

				where charindex('F2',Warehouse) > 0

				group by Itemnumber,Physicaldate,Number,Size,Color,ItemGroup) b



				select distinct a.InsptDate,a.ID,a.CreatedBy,a.SysCreateDate,case when a.Metal = 1 then 'P' else case when a.Metal = 0 then 'F' else null end end Metal,

				a.Result AQLInspt,a.Remark,e.Approval,isnull(e.Remark,'') RemarkApp,b.Number PO,b.ItemGroup MatrClass,b.Itemnumber MatrCode,b.Color,b.Size,b.Qty,d.Customerrequisition JobNo,c.Itemnumber2 Style,'' LabRs

				from (select * from InlineAccWHInspt WITH(NOLOCK) where Factory = @dt1 and InsptDate between @dt2 and dateadd(day,1,@dt3) and Comment is null) a

				inner join #tempPerA b on a.ID = b.ID

				left join InlineERPECCReqPOFirmHistory c WITH(NOLOCK) on b.Number = c.Purchaseorder

				left join InlineERPSalesOrders d WITH(NOLOCK) on c.Salesorder = d.Salesorder

				left join InlineAccWHInsptApproval e WITH(NOLOCK) on a.ID = e.ID and isnull(d.Customerrequisition,'') = isnull(e.Job,'') and isnull(c.Itemnumber2,'') = isnull(e.Style,'') and e.Comment is null

				order by b.Number



				select a.ID,(select top 1 result from hr.dbo.lab_result WITH(NOLOCK) where id_book = b.id_book) LabRs

				from

				(select distinct a.InsptDate,a.ID,a.CreatedBy,a.SysCreateDate,case when a.Metal = 1 then 'P' else case when a.Metal = 0 then 'F' else null end end Metal,

				a.Result AQLInspt,a.Remark,e.Approval,isnull(e.Remark,'') RemarkApp,b.Number PO,b.ItemGroup MatrClass,b.Itemnumber MatrCode,b.Color,b.Size,b.Qty,d.Customerrequisition JobNo,c.Itemnumber2 Style

				from (select * from InlineAccWHInspt WITH(NOLOCK) where Factory = @dt1 and InsptDate between @dt2 and dateadd(day,1,@dt3) and Comment is null) a

				inner join #tempPerA b on a.ID = b.ID

				left join InlineERPECCReqPOFirmHistory c WITH(NOLOCK) on b.Number = c.Purchaseorder

				left join InlineERPSalesOrders d WITH(NOLOCK) on c.Salesorder = d.Salesorder

				left join InlineAccWHInsptApproval e WITH(NOLOCK) on a.ID = e.ID and isnull(d.Customerrequisition,'') = isnull(e.Job,'') and isnull(c.Itemnumber2,'') = isnull(e.Style,'') and e.Comment is null) a

				left join hr.dbo.book_pro b WITH(NOLOCK) on CHARINDEX(b.po,a.ID collate SQL_Latin1_General_CP1_CI_AS) > 0 and CHARINDEX(b.item,a.ID collate SQL_Latin1_General_CP1_CI_AS) > 0 and CHARINDEX(b.article,a.ID collate SQL_Latin1_General_CP1_CI_AS ) > 0

				where b.type_test not in ('ft','gt') and b.status_book = 'release'

				order by a.PO



				drop table #tempPerA



				--Top Defect [2]

				select top 5 a.Code,b.DefectEN,b.DefectVN,a.Qty 

				from

				(select b.Code,sum(Qty) Qty from

				(select * from InlineAccWHInspt WITH(NOLOCK) where Factory = @dt1 and InsptDate between @dt2 and @dt3 and Comment is null) a

				inner join InlineAccWHInsptDefct b WITH(NOLOCK) on a.ID = b.ID

				group by Code) a

				inner join ADSDefectManager b WITH(NOLOCK) on a.Code = b.Code

				order by a.Qty desc



				--Top Items [3]

				select top 5 *

				from

				(select substring(Item,1,charindex('+',Item)-1) Item,sum(Qty) Qty 

				from

				(select substring(b.ID,charindex('+',b.ID)+1,len(b.ID)) Item,b.* 

				from

				(select * from InlineAccWHInspt WITH(NOLOCK) where Factory = @dt1 and InsptDate between @dt2 and @dt3 and Comment is null) a

				inner join InlineAccWHInsptDefct b WITH(NOLOCK) on a.ID = b.ID) a

				group by substring(Item,1,charindex('+',Item)-1)) a

				order by Qty desc*/

				--SELECT GETDATE()





				SELECT InsptDate InsDate,CreatedBy,Result,Metal,SUBSTRING(ID,0,CHARINDEX('+',ID)) Po,ID

				INTO #Temp_InsList

				FROM dbo.InlineAccWHInspt WITH (NOLOCK)

				WHERE Comment IS NULL AND

				Factory = @dt1 AND

				InsptDate IS NOT NULL AND

				SysCreateDate IS NOT NULL AND

				CAST(InsptDate AS DATE) >= @dt2 AND

				CAST(InsptDate AS DATE) <= @dt3



				SELECT a.Itemnumber,a.Physicaldate,a.Quantity,a.Size,a.Color,a.Style,a.Batchnumber,a.ItemGroup,a.Configuration,

				a.Batchnumber+'+'+a.Itemnumber+'+'+CASE WHEN ISNULL(a.Color,'') = 'NO' THEN '' ELSE ISNULL(a.Color,'') END+'+'+CASE WHEN ISNULL(a.Size,'') = 'NO' THEN '' ELSE ISNULL(a.Size,'') END+'+'+CAST(a.Quantity AS NVARCHAR)+'+'+a.ItemGroup ID 

				INTO #Temp_Pk

				FROM

				(SELECT a.Itemnumber,a.Physicaldate,SUM(a.Quantity) Quantity,a.Size,a.Color,a.Style,a.Batchnumber,a.ItemGroup,a.Configuration

				FROM

				(SELECT DISTINCT b.Itemnumber,b.Physicaldate,b.Quantity,b.Size,b.Color,b.Style,b.Batchnumber,b.ItemGroup,b.Configuration

				FROM #Temp_InsList a

				INNER JOIN dbo.InlineERPTransactions_Main b WITH (NOLOCK)

				ON a.Po = b.Batchnumber

				WHERE b.Reference LIKE '%Purchase%' AND

				b.Quantity > 0) a

				GROUP BY a.Itemnumber,a.Physicaldate,a.Size,a.Color,a.Style,a.Batchnumber,a.ItemGroup,a.Configuration) a



				SELECT DISTINCT a.*,b.Job JobNo,b.Style,CASE WHEN ISNULL(b.Approval,'') = '' THEN a.AQLInspt ELSE b.Approval END Approval

				INTO #Temp_PkList_Acc

				FROM

				(SELECT a.InsDate,a.ID,a.CreatedBy,a.InsDate SysCreateDate,

				CASE WHEN ISNULL(a.Metal,1) = 1 THEN 'P' ELSE 'F' END Metal,

				a.Result AQLInspt,b.Batchnumber PO,b.ItemGroup MatrClass,b.Itemnumber MatrCode,

				CASE WHEN ISNULL(b.Color,'') = 'NO' THEN '' ELSE ISNULL(b.Color,'') END Color,

				CASE WHEN ISNULL(b.Size,'') = 'NO' THEN '' ELSE ISNULL(b.Size,'') END Size,

				b.Quantity Qty

				FROM #Temp_InsList a

				INNER JOIN #Temp_Pk b 

				ON a.ID = b.ID) a

				LEFT JOIN dbo.InlineAccWHInsptApproval b WITH (NOLOCK)

				ON a.ID = b.ID



				/*=================================================//////////*Table 0*//////////=================================================*/

				SELECT a.*,CASE WHEN ISNULL((SELECT TOP 1 result FROM hr.dbo.lab_result WHERE id_book = b.id_book),'') = '' THEN 'InProcess' ELSE ISNULL((SELECT TOP 1 result FROM hr.dbo.lab_result WHERE id_book = b.id_book),'') END LabRs

				FROM #Temp_PkList_Acc a

				LEFT JOIN hr.dbo.book_pro b WITH (NOLOCK)

				ON a.PO COLLATE SQL_Latin1_General_CP1_CI_AS = b.po AND a.MatrCode COLLATE SQL_Latin1_General_CP1_CI_AS = b.item AND a.Color COLLATE SQL_Latin1_General_CP1_CI_AS = b.article AND b.status_book = 'release'

				/*=================================================//////////*END*//////////=================================================*/



				SELECT b.Itemnumber,a.Code,SUM(a.Qty) Qty

				INTO #Temp_def

				FROM

				(SELECT DISTINCT a.ID,a.Code,a.Qty

				FROM dbo.InlineAccWHInsptDefct a WITH (NOLOCK)

				INNER JOIN #Temp_InsList b ON a.ID = b.ID) a

				INNER JOIN #Temp_Pk b ON a.ID = b.ID

				GROUP BY b.Itemnumber,a.Code



				/*=================================================//////////*Table 1*//////////=================================================*/

				SELECT TOP 5 Itemnumber Item,SUM(Qty) Qty

				FROM #Temp_def

				GROUP BY Itemnumber

				ORDER BY SUM(Qty) DESC

				/*=================================================//////////*END*//////////=================================================*/



				/*=================================================//////////*Table 2*//////////=================================================*/

				SELECT TOP 5 a.Code,b.DefectEN,b.DefectVN,a.Qty

				from

				(SELECT Code,SUM(Qty) Qty

				FROM #Temp_def

				GROUP BY Code) a

				INNER JOIN ADSDefectManager b WITH (NOLOCK)

				ON a.Code = b.Code

				ORDER BY Qty DESC

				/*=================================================//////////*END*//////////=================================================*/



				/*=================================================//////////*Table 3*//////////=================================================*/

				SELECT b.Configuration,a.Code,SUM(a.Qty) Qty

				INTO #Temp_def_config

				FROM

				(SELECT DISTINCT a.ID,a.Code,a.Qty

				FROM dbo.InlineAccWHInsptDefct a WITH (NOLOCK)

				INNER JOIN #Temp_InsList b ON a.ID = b.ID) a

				INNER JOIN #Temp_Pk b ON a.ID = b.ID

				GROUP BY b.Configuration,a.Code



				SELECT TOP 5 a.Configuration,a.Name,ROUND((Quantity - Qty) / Quantity,2) * 100 RFT

				FROM

				(SELECT a.*,c.Name,ISNULL(SUM(b.Qty),0) Qty

				FROM

				(SELECT Configuration,SUM(Quantity) Quantity

				FROM #Temp_Pk

				GROUP BY Configuration) a

				LEFT JOIN #Temp_def_config b ON a.Configuration = b.Configuration

				LEFT JOIN dbo.InlineERPVendor_Main c WITH (NOLOCK) ON a.Configuration = c.Vendoraccount

				GROUP BY a.Configuration,a.Quantity,c.Name) a

				ORDER BY RFT DESC



				/*=================================================//////////*END*//////////=================================================*/



				DROP TABLE #Temp_InsList,#Temp_Pk,#Temp_PkList_Acc,#Temp_def,#Temp_def_config



			end-- exec InlineAccGetLoadData 84,'F2','20231030','20231031','','',''

		else if(@type=85)

			begin

				select ISNULL(sum(TotalEarned)/sum(TotalWorker)*100,0) ActualEFF

				from cpdtlsdays WITH(NOLOCK) 

				where FacLine like @dt1+'%'

				and ProDate = @dt2--'20221224' --between @BeginDate and @EndDate

				--and left(Result,1)='_'-- and DefSAM is not null

				--group by FacLine

			end -- exec InlineAccGetLoadData 85,'F2','20221224','','','',''

		else if(@type=86)

			begin

				set @sql='update InlineAccWHLocHis set Comment = '''+@dt2+''' where RecNo in (select a.RecNo

				from

				(select * from InlineAccWHLocHis) a

				inner join '+quotename(@dt1)+' b on a.BatchNumber = b.BatchNumber and a.ItemNumber = b.ItemNumber and a.Color = b.Color and a.Size = b.Size and a.Qty = b.Qty

				where a.Comment is null) 

				insert into InlineAccWHLocHis(BatchNumber,ItemNumber,Color,Size,Qty,Location,CreatedBy,SysCreateDate)

				select BatchNumber,ItemNumber,Color,Size,Qty,'''+@dt3+''','''+@dt2+''',getdate() from '+quotename(@dt1)+

				' drop table '+quotename(@dt1)

			end -- exec InlineAccGetLoadData 86,'InlineAccLoc_Temp20221228083533','Shin-Manual','A0-1','','',''

		else if(@type=87)

			begin

				SELECT distinct Sub_No FROM A1AF1Plan WITH(NOLOCK) where left(Line,2) in ('F1','F2','F3','F4') and End_Sewing between getdate()-3 and getdate() + 7

			end

			-- exec InlineAccGetLoadData 87,'','','','','',''

		else if(@type=88)

			begin

				set @sql = 'insert into InlineAccWHIssue(FacLine,Job,ID,Qty,CreatedBy,SysCreateDate) 

				select '''+@dt1+''','''+@dt2+''',ID,Qty,'''+@dt3+''',getdate() from '+quotename(@dt4)+' drop table '+quotename(@dt4)

			end

			-- exec InlineAccGetLoadData 88,'','','','','',''

		else if(@type=89)

			begin

				if(@dt1='Ad')

					begin

						select distinct b.Inspector,convert(varchar(10),a.PlanDate,120) PlanDate,case when a.Status = 'P' then 'Pass' else case when a.Status = 'F' then 'Fail' else 'n/a' end end Inspect,

						case when a.Status = 'P' then 'Accepted' else case when a.Status = 'F' then 'Rework' else 'n/a' end end App,a.PONo,convert(varchar(10),b.SysCreateDate,120) SubmitDate,c.InsQty QtyPO,b.InsQTY,d.Moisturestandard,e.DefCode,e.DefDescription

						into #tAd

						from InlineFGsWHPlanBook a WITH(NOLOCK)

						inner join QCFinalReport b WITH(NOLOCK) on a.PlanID = b.PlanID

						inner join InlineFGsWHInspector c WITH(NOLOCK) on a.PlanID = c.PlanID

						left join QCFinalMoisture d WITH(NOLOCK) on b.RecNo = d.RecNo

						left join QCFinalDefImg e WITH(NOLOCK) on b.RecNo = e.RecNo

						where (convert(varchar(8),a.PlanDate,112) between @dt2 and @dt3)



						select distinct a.Inspector,a.PlanDate,a.Inspect,a.App,a.PONo,a.SubmitDate,a.QtyPO,a.InsQTY,a.Moisturestandard,DefCode = STUFF(

						(SELECT ' , ' + cast(isnull(DefCode,'') as nvarchar(1000))

						FROM #tAd b

						WHERE a.Inspector=b.Inspector and a.PlanDate=b.PlanDate and a.Inspect=b.Inspect and a.App=b.App and a.PONo=b.PONo and a.SubmitDate = b.SubmitDate and a.QtyPO=b.QtyPO and a.InsQTY=b.InsQTY and a.Moisturestandard=b.Moisturestandard

						FOR XML PATH (''))

						, 1, 1, '')

						,DefDescription = STUFF(

						(SELECT ' , ' + cast(isnull(DefDescription,'') as nvarchar(1000))

						FROM #tAd b

						WHERE a.Inspector=b.Inspector and a.PlanDate=b.PlanDate and a.Inspect=b.Inspect and a.App=b.App and a.PONo=b.PONo and a.SubmitDate = b.SubmitDate and a.QtyPO=b.QtyPO and a.InsQTY=b.InsQTY and a.Moisturestandard=b.Moisturestandard

						FOR XML PATH (''))

						, 1, 1, '')

						into #tAd1

						from #tAd a



						select distinct a.Inspector,a.PlanDate,a.Inspect,a.App,a.PONo,

						Sku = STUFF(

						(SELECT ' , ' + cast(isnull(Sku,'') as nvarchar(1000))

						FROM (select distinct a.*,b.BuyerItem+'_'+b.ManuSize Sku

						from #tAd1 a

						inner join InlineFGsWHPkList b WITH(NOLOCK) on a.PONo = b.PONo) b

						WHERE a.Inspector=b.Inspector and a.PlanDate=b.PlanDate and a.Inspect=b.Inspect and a.App=b.App and a.PONo=b.PONo and a.SubmitDate = b.SubmitDate and a.QtyPO=b.QtyPO and a.InsQTY=b.InsQTY and a.Moisturestandard=b.Moisturestandard

						FOR XML PATH (''))

						, 1, 1, ''),a.SubmitDate,a.QtyPO,a.InsQTY,a.Moisturestandard,a.DefCode,a.DefDescription

						into #tAd2

						from

						(select distinct a.*,b.BuyerItem+'_'+b.ManuSize Sku

						from #tAd1 a

						inner join InlineFGsWHPkList b WITH(NOLOCK) on a.PONo = b.PONo) a



						select a.Inspector,a.PlanDate,a.Inspect,a.App,a.PONo,a.Sku,a.SubmitDate,a.QtyPO,a.InsQTY,a.Moisturestandard,b.ShipDest Destination,b.ShipDate ETD,'' LINE,a.DefCode,a.DefDescription,'' OPERATORS

						from #tAd2 a

						inner join saoship b WITH(NOLOCK) on a.PONo = b.LotRef

						order by PlanDate desc



						--drop table #t,#t1,#t2

					end

				else

					begin

						select distinct b.Inspector,convert(varchar(10),a.PlanDate,120) PlanDate,case when a.Status = 'P' then 'Pass' else case when a.Status = 'F' then 'Fail' else 'n/a' end end Inspect,

						case when a.Status = 'P' then 'Accepted' else case when a.Status = 'F' then 'Rework' else 'n/a' end end App,a.PONo,convert(varchar(10),b.SysCreateDate,120) SubmitDate,c.InsQty QtyPO,b.InsQTY,d.Moisturestandard,e.DefCode,e.DefDescription

						into #Ft

						from InlineFGsWHPlanBook a WITH(NOLOCK)

						inner join QCFinalReport b WITH(NOLOCK) on a.PlanID = b.PlanID

						inner join InlineFGsWHInspector c WITH(NOLOCK) on a.PlanID = c.PlanID

						left join QCFinalMoisture d WITH(NOLOCK) on b.RecNo = d.RecNo

						left join QCFinalDefImg e WITH(NOLOCK) on b.RecNo = e.RecNo

						where a.Factory = @dt1 and (convert(varchar(8),a.PlanDate,112) between @dt2 and @dt3)



						select distinct a.Inspector,a.PlanDate,a.Inspect,a.App,a.PONo,a.SubmitDate,a.QtyPO,a.InsQTY,a.Moisturestandard,DefCode = STUFF(

						(SELECT ' , ' + cast(isnull(DefCode,'') as nvarchar(1000))

						FROM #Ft b

						WHERE a.Inspector=b.Inspector and a.PlanDate=b.PlanDate and a.Inspect=b.Inspect and a.App=b.App and a.PONo=b.PONo and a.SubmitDate = b.SubmitDate and a.QtyPO=b.QtyPO and a.InsQTY=b.InsQTY and a.Moisturestandard=b.Moisturestandard

						FOR XML PATH (''))

						, 1, 1, '')

						,DefDescription = STUFF(

						(SELECT ' , ' + cast(isnull(DefDescription,'') as nvarchar(1000))

						FROM #Ft b

						WHERE a.Inspector=b.Inspector and a.PlanDate=b.PlanDate and a.Inspect=b.Inspect and a.App=b.App and a.PONo=b.PONo and a.SubmitDate = b.SubmitDate and a.QtyPO=b.QtyPO and a.InsQTY=b.InsQTY and a.Moisturestandard=b.Moisturestandard

						FOR XML PATH (''))

						, 1, 1, '')

						into #Ft1

						from #Ft a



						select distinct a.Inspector,a.PlanDate,a.Inspect,a.App,a.PONo,

						Sku = STUFF(

						(SELECT ' , ' + cast(isnull(Sku,'') as nvarchar(1000))

						FROM (select distinct a.*,b.BuyerItem+'_'+b.ManuSize Sku

						from #Ft1 a

						inner join InlineFGsWHPkList b WITH(NOLOCK) on a.PONo = b.PONo) b

						WHERE a.Inspector=b.Inspector and a.PlanDate=b.PlanDate and a.Inspect=b.Inspect and a.App=b.App and a.PONo=b.PONo and a.SubmitDate = b.SubmitDate and a.QtyPO=b.QtyPO and a.InsQTY=b.InsQTY and a.Moisturestandard=b.Moisturestandard

						FOR XML PATH (''))

						, 1, 1, ''),a.SubmitDate,a.QtyPO,a.InsQTY,a.Moisturestandard,a.DefCode,a.DefDescription

						into #tF2

						from

						(select distinct a.*,b.BuyerItem+'_'+b.ManuSize Sku

						from #Ft1 a

						inner join InlineFGsWHPkList b WITH(NOLOCK) on a.PONo = b.PONo) a



						select a.Inspector,a.PlanDate,a.Inspect,a.App,a.PONo,a.Sku,a.SubmitDate,a.QtyPO,a.InsQTY,a.Moisturestandard,b.ShipDest Destination,b.ShipDate ETD,'' LINE,a.DefCode,a.DefDescription,'' OPERATORS

						from #tF2 a

						inner join saoship b WITH(NOLOCK) on a.PONo = b.LotRef

						order by PlanDate desc

					end

			end

			-- exec InlineAccGetLoadData 89,'F2','20230101','20230218','','',''

		else if(@type=90)

			begin

				select c.Inspector,a.PlanDate,a.Status,a.AQLPlan,a.JobNo,a.PONo,c.InsQty,b.SysCreateDate SubDate,a.PlanID

				into #Final

				from

				(select * 

				from DtradeProduction.dbo.InlineFGsWHPlanBook WITH(NOLOCK) 

				where Factory = @dt1) a

				left join DtradeProduction.dbo.QCFinalReport b WITH(NOLOCK) 

				on a.PlanID = b.PlanID

				left join DtradeProduction.dbo.InlineFGsWHInspector c WITH(NOLOCK) 

				on a.PlanID = c.PlanID



				select distinct a.Inspector,a.PlanDate,a.Status,a.AQLPlan,a.JobNo,a.PONo,a.InsQty,a.SubDate,a.PlanID,b.BuyerItem+'_'+b.ManuSize Sku

				into #Final1

				from #Final a

				inner join DtradeProduction.dbo.InlineFGsWHPkList b WITH(NOLOCK)

				on charindex(b.PONo,a.PONo) > 0 and charindex(b.PlanRefNo,a.JobNo) > 0



				select b.EmployeeName Inspector,a.PlanDate,InsRs,case when a.InsRs = 'Pass' then 'Accepted' else case when a.InsRs = 'Reject' then 'Pending' else 'NonComplete' end end AppStt,a.PONo,a.Sku,a.SubDate,a.InsQty QtyToIns,a.InsQty QtyInsDone,a.InsQty Total
Qty,PlanID

				from

				(select distinct Inspector,PlanDate,case when Status = 'P' then 'Pass' else case when Status = 'F' then 'Reject' else 'NonComplete' end end InsRs,AQLPlan,PONo,InsQty,SubDate,Sku = STUFF(

				(SELECT case when isnull(Sku,'') <> '' then cast(isnull(Sku,'') as nvarchar(1000)) + ',' else '' end

				FROM #Final1 b

				WHERE a.JobNo = b.JobNo and a.PONo = b.PONo

				FOR XML PATH (''))

				, 1, 1, ''),PlanID

				from #Final1 a) a

				left join DtradeProduction.dbo.InLineQcUserDetail b WITH(NOLOCK)

				on a.Inspector = b.EmployeeCode

				order by PlanDate desc



				--drop table #Final,#Final1

			end

			-- exec InlineAccGetLoadData 90,'F2','','','','',''

		else if(@type=91)

			begin

				set @sql='insert into DtradeProduction.dbo.InlineFGsWHPlanHisDeleteBook(PONo,Inspector,SysCreateDate) select PONo,'''+@dt2+''',getdate() from DtradeProduction.dbo.InlineFGsWHPlanBook where PlanID = '+@dt1+

				' delete from DtradeProduction.dbo.InlineFGsWHPlanBook where PlanID = '+@dt1+

				' delete from DtradeProduction.dbo.QCFinalReport where PlanID = '+@dt1

			end

			-- exec InlineAccGetLoadData 91,'1000','kieuhuynh','','','',''

		else if(@type=92)

			begin

				--select * from DtradeProduction.dbo.InlineERPECCReqPOFirmHistory where lower(Purchaseorder) like '%'+lower(@dt1)

				select a.*,b.Salesorder,b.Itemnumber2 

				from DtradeProduction.dbo.InlineERPTransactions_Main a WITH(NOLOCK)

				left join DtradeProduction.dbo.InlineERPECCReqPOFirmHistory b WITH(NOLOCK)

				on a.Batchnumber = b.Purchaseorder and a.Itemnumber = b.Itemnumber and a.Color = b.Color and charindex('Purchase',a.Reference) > 0

				where lower(a.Batchnumber) like '%'+@dt1

			end

			-- exec InlineAccGetLoadData 92,'05687','','','','',''

		else if(@type=93)

			begin

				select distinct Purchaseorder from DtradeProduction.dbo.InlineERPECCReqPOFirmHistory WITH(NOLOCK)

			end

			-- exec InlineAccGetLoadData 93,'','','','','',''

		else if(@type=94)

			begin

				--set @sql = 'select distinct Customerrequisition from DtradeProduction.dbo.InlineERPSalesOrders where Salesorder in ('+@dt1+')'

				set @sql = 'select distinct b.Itemnumber2 Style,a.Customerrequisition JobNo 

						from InlineERPSalesOrders a WITH(NOLOCK)

						inner join InlineERPECCReqPOFirmHistory b WITH(NOLOCK)

						on a.Salesorder = b.Salesorder

						where b.Salesorder in ('+@dt1+')

						order by b.Itemnumber2'

			end

			-- exec InlineAccGetLoadData 94,''SOPU2245025','SOPU2245027','SOPU2245029','SOPU2245023','SOPU2245040','SOPU2245005','SOPU2245009','SOPU2245011','SOPU2245013','SOPU2245021','SOPU2245015','SOPU2245017'','','','','',''

		else if(@type=95)

			begin

				select Name from DtradeProduction.dbo.InlineERPVendor_Main WITH(NOLOCK) where Vendoraccount in (select Configuration from DtradeProduction.dbo.InlineERPTransactions_Main WITH(NOLOCK) where Batchnumber = @dt1)

			end

			-- exec InlineAccGetLoadData 95,'POPU0005687','','','','',''

		else if(@type=96)

			begin

				select Physicaldate,sum(Quantity) Qty 

				from DtradeProduction.dbo.InlineERPTransactions_Main WITH(NOLOCK) 

				where Number = @dt1 and Itemnumber = @dt2 and isnull(Color,'') = @dt3 and isnull(Size,'') = @dt4

				group by Physicaldate

			end

			-- exec InlineAccGetLoadData 96,'POPU0005687','HT-000395-0000','137-95-00','NO','',''

		else if(@type=97)

			begin

				select Physicaldate,sum(Quantity) Qty 

				from DtradeProduction.dbo.InlineERPTransactions_Main WITH(NOLOCK) 

				where Number = @dt1 and Itemnumber = @dt2 and isnull(Color,'') = @dt3 --and isnull(Size,'') = @dt4

				group by Physicaldate

			end

			-- exec InlineAccGetLoadData 97,'POPU0005687','HT-000395-0000','137-95-00','NO','',''

		else if(@type = 98)

			begin

				select Purchaseorder,Itemnumber,Size,Color,Warehouse,Unit,round(sum(Quantity),2) Quantity,ItemGroup,ROW_NUMBER() over (order by ItemGroup) Stt

				from

				(select distinct a.*,b.Quantity,b.ItemGroup

				from

				(select distinct Purchaseorder,Itemnumber,Size,Color,Warehouse,Unit 

				from InlineERPECCReqPOFirmHistory WITH(NOLOCK) 

				where Salesorder in (select distinct Salesorder from InlineERPSalesOrders WITH(NOLOCK) where Customerrequisition = @dt1)) a

				left join InlineERPTransactions_Main b WITH(NOLOCK)

				on a.Purchaseorder = b.Batchnumber and a.Itemnumber = b.Itemnumber and a.Size = b.Size and a.Color = b.Color

				where Reference = 'Purchase order') a

				group by Purchaseorder,Itemnumber,Size,Color,Warehouse,Unit,ItemGroup

			end

			-- exec InlineAccGetLoadData 98,'00882','','','','',''

		else if(@type = 99)

			begin

				select Customerrequisition,MatrClass,InventBatchIdPO,MaterialCode,MaterialName,Color,Size,RMStyle,sum(cast(ReserveQty as float)) ReserveQty,UnitOfRM,SuppCode

				into #tPkList_Job

				from InlineERPWHMaterialFull WITH(NOLOCK) 

				where lower(Customerrequisition) like '%'+lower(@dt1)

				group by Customerrequisition,MatrClass,InventBatchIdPO,MaterialCode,MaterialName,Color,Size,RMStyle,UnitOfRM,SuppCode



				select Customerrequisition,MatrClass,InventBatchIdPO,MaterialCode,MaterialName,Color,Size,RMStyle,ReserveQty,UnitOfRM,Name

				from #tPkList_Job a

				left join InlineERPVendor_Main b WITH(NOLOCK)

				on a.SuppCode = b.Vendoraccount



				drop table #tPkList_Job

			end

			-- exec InlineAccGetLoadData 99,'00335','','','','',''

		else if(@type = 100)

			begin

				set @sql = 'insert into InlineAccWHIssue([Job],[PONo],[FacLine],[BatchNumber],[ItemNumber],[Size],[Color],[Unit],[ItemGroup],[Qty],[CreatedBy],[SysCreateDate],[Factory]) 

				select '''+@dt1+''','''+@dt2+''','''+@dt3+''',[BatchNumber],[ItemNumber],[Size],[Color],[Unit],[ItemGroup],[Qty],'''+@dt4+''',getdate(),'''+@dt6+''' from '+quotename(@dt5)+ ' 

				drop table '+quotename(@dt5)

			end

			-- exec InlineAccGetLoadData 100,'','','','','',''

		else if(@type = 101)

			begin

				select [Job],[PONo],[FacLine],[BatchNumber],[ItemNumber],[Size],[Color],[Unit],[ItemGroup],[Qty],[CreatedBy],[SysCreateDate],[Factory] from InlineAccWHIssue WITH(NOLOCK) where Factory = @dt1

			end-- exec InlineAccGetLoadData 101,'','','','','',''

		else if(@type = 102)

			begin

				--select DateNeed,FacLine,JobNo,ColorCode,Size,PONo,ReqQty 

				--from InlineQcKanban 

				--where DateNeed >= dateadd(day,-14,getdate()) and left(FacLine,2) = @dt1 

				--order by DateNeed desc

				--select distinct a.DateNeed,a.FacLine,a.JobNo,a.ColorCode,a.Size,a.PONo,a.ReqQty,case when b.JobNumber is null then 'Non-Complete' else 'Done' end Status 

				--from InlineQcKanban a WITH(NOLOCK)

				--left join InlineERPTransactions_Main b WITH(NOLOCK)

				--on a.JobNo = b.JobNumber 

				--where DateNeed >= dateadd(day,-7,getdate()) and left(FacLine,2) = @dt1 

				--order by DateNeed DESC

                

				SELECT DateNeed,FacLine,JobNo,ColorCode,Size,PONo,ReqQty

				INTO #Temp_102

				FROM InlineQcKanban

				WHERE DateNeed >= dateadd(day,-7,getdate()) and left(FacLine,2) = @dt1



				SELECT DISTINCT a.DateNeed,a.FacLine,a.JobNo,a.ColorCode,a.Size,a.PONo,a.ReqQty,CASE WHEN CHARINDEX('all',LOWER(a.PONo)) > 0 THEN 'Done' ELSE CASE WHEN b.JobNumber is null then 'Non-Complete' else 'Done' END END Status

				FROM #Temp_102 a

				LEFT JOIN InlineERPTransactions_Main b WITH (NOLOCK) ON a.JobNo = b.JobNumber AND RIGHT(a.PONo,6) = RIGHT(b.Customerreference,6)

			end-- exec InlineAccGetLoadData 102,'F2','','','','',''

		else if(@type = 103)

			begin

				set @sql = 'update '+quotename(@dt1)+' set Color = case when Color = ''NO'' then '''' else Color end,Size = case when Size = ''NO'' then '''' else Size end  

				update DtradeProduction.dbo.InlineAccWHLocHis set Comment = '''+@dt2+''' where RecNo in (select a.RecNo 

				from DtradeProduction.dbo.InlineAccWHLocHis a

				inner join '+quotename(@dt1)+' b 

				on a.BatchNumber = b.Batchnumber and a.ItemNumber = b.Itemnumber and a.Color = b.Color and a.Size = b.Size) 

				insert into DtradeProduction.dbo.InlineAccWHLocHis(BatchNumber,ItemNumber,Color,Size,Qty,Location,CreatedBy,SysCreateDate,Factory) 

				select Batchnumber,Itemnumber,Color,Size,Qty,Location,'''+@dt2+''',getdate(),'''+@dt3+''' from '+quotename(@dt1)+ ' 

				drop table '+quotename(@dt1)

			end-- exec InlineAccGetLoadData 103,'InlineAccWH_UploadLocation_230707103107','','','','',''

		ELSE IF @type = 104

			BEGIN

				SELECT CAST(InsptDate AS DATE) InsDate,ID,Result

				INTO #temp_1

				FROM dbo.InlineAccWHInspt WITH (NOLOCK)

				WHERE Factory = @dt1 

				AND Comment IS NULL

				AND CAST(InsptDate AS DATE) >= @dt2

				AND CAST(InsptDate AS DATE) <= @dt3

				AND Result IS NOT NULL



				SELECT Itemnumber,Physicaldate,Quantity,Unit,Configuration,Size,Color,Style,Batchnumber,ItemGroup

				,a.Batchnumber+'+'+a.Itemnumber+'+'+a.Color+'+'+a.Size+'+'+CAST(a.Quantity AS NVARCHAR)+'+'+a.ItemGroup ID

				INTO #temp_2

				FROM 

				(SELECT Itemnumber,Physicaldate,Quantity,Unit,Configuration

				,CASE WHEN Size = 'NO' THEN '' ELSE Size END Size

				,CASE WHEN Color = 'NO' THEN '' ELSE Color END Color

				,CASE WHEN Style = 'NO' THEN '' ELSE Style END Style

				,Batchnumber,ItemGroup

				FROM

				(SELECT Itemnumber,Physicaldate,SUM(CAST(Quantity AS FLOAT)) Quantity,Unit,Configuration,Size,Color,Style,Batchnumber,ItemGroup

				FROM 

				(SELECT Itemnumber,Physicaldate,Quantity,Unit,Configuration,Size,Color,Style,Batchnumber,ItemGroup

				FROM dbo.InlineERPTransactions_Main WITH (NOLOCK)

				WHERE Batchnumber IN (SELECT LEFT(ID,CHARINDEX('+',ID)-1) FROM #temp_1)

				AND Reference LIKE '%Purchase%'

				/*AND Receipt = 'Purchased'*/) a

				GROUP BY Itemnumber,Physicaldate,Unit,Configuration,Size,Color,Style,Batchnumber,ItemGroup) a) a



				SELECT a.InsDate,a.ID,CASE WHEN a.Result = 'P' THEN 'Pass' WHEN a.Result = 'F' THEN 'Fail' END Result,b.Itemnumber,b.Physicaldate,b.Quantity,b.Unit,b.Configuration,c.Name,b.Size,b.Color,b.Style,b.Batchnumber,b.ItemGroup

				INTO #temp_3

				FROM #temp_1 a

				INNER JOIN #temp_2 b ON a.ID = b.ID

				--LEFT JOIN InlineERPVendor_Main c WITH (NOLOCK) ON b.Configuration = c.Vendoraccount

				LEFT JOIN (SELECT ACCOUNTNUM COLLATE DATABASE_DEFAULT AS ACCOUNTNUM, NAME COLLATE DATABASE_DEFAULT AS NAME FROM OPENQUERY([192.168.43.20], SELECT a.ACCOUNTNUM, b.NAME FROM AXDB.dbo.VENDTABLE a WITH (NOLOCK) LEFT JOIN AXDB.dbo.DIRPARTYTABLE b WITH (NOLOCK) ON a.PARTY = b.RECID)) c ON b.Configuration COLLATE DATABASE_DEFAULT = c.ACCOUNTNUM



				SELECT a.Code,SUM(a.Qty) Qty,a.Itemnumber,a.Physicaldate,a.Configuration,a.Color,a.Batchnumber,a.ItemGroup

				INTO #temp_defect

				FROM

				(SELECT a.ID,a.Code,a.Qty,b.Itemnumber,b.Physicaldate,b.Quantity,b.Unit,b.Configuration,b.Size,b.Color,b.Style, b.Batchnumber,b.ItemGroup

				FROM dbo.InlineAccWHInsptDefct a WITH (NOLOCK)

				INNER JOIN #temp_3 b ON a.ID = b.ID) a

				GROUP BY a.Code,a.Itemnumber,a.Physicaldate,a.Configuration,a.Color,a.Batchnumber,a.ItemGroup



				SELECT InsDate,Result,Itemnumber,Physicaldate,SUM(Quantity) Quantity,Configuration,Name,Color,Batchnumber,ItemGroup

				INTO #temp_4

				FROM #temp_3

				GROUP BY InsDate,Result,Itemnumber,Physicaldate,Configuration,Name,Color,Batchnumber,ItemGroup



				SELECT LoadSize1,LoadSize2,SampleSize

				INTO #temp_aql

				FROM dbo.AQLLevel

				WHERE Dept = 'Accessary' AND LevelNo = 'AQL 2.5 Minor' --AND Customer = 'Puma'



				SELECT Code,DefectEN,DefectVN

				INTO #defect

				FROM ADSDefectManager

				WHERE Defect = 10

				ORDER BY NO



				SELECT a.Itemnumber,a.Physicaldate,a.Configuration,a.Color,a.Batchnumber,a.ItemGroup,SUM(a.Qty) Qty

				INTO #temp_sum_defect

				FROM #temp_defect a 

				GROUP BY a.Itemnumber,a.Physicaldate,a.Configuration,a.Color,a.Batchnumber,a.ItemGroup



				SELECT a.Physicaldate,CONVERT(VARCHAR(10),a.InsDate,120) InsDate,a.Name,a.Batchnumber,'' Job,'' Style,a.ItemGroup,a.Itemnumber,a.Color,a.Quantity,a.AQL,a.QtyApp,a.QtyDefect,a.PerF,a.PerP,a.Result

				INTO #temp_L

				FROM

				(SELECT DISTINCT a.*,a.AQL - a.QtyDefect QtyApp,ROUND(CAST(a.QtyDefect AS FLOAT)/CAST(a.AQL AS FLOAT),2) PerF,ROUND((CAST(a.AQL AS FLOAT) - CAST(a.QtyDefect AS FLOAT))/a.AQL,2) PerP

				FROM

				(SELECT a.*,(SELECT SampleSize FROM #temp_aql WHERE LoadSize1 <= a.Quantity AND LoadSize2 >= a.Quantity) AQL,ISNULL(b.Qty,0) QtyDefect

				FROM #temp_4 a

				LEFT JOIN #temp_sum_defect b 

				ON a.Itemnumber = b.Itemnumber 

				AND a.Physicaldate = b.Physicaldate

				AND a.Configuration = b.Configuration

				AND a.Color = b.Color

				AND b.Batchnumber = a.Batchnumber

				AND b.ItemGroup = a.ItemGroup) a) a

				ORDER BY a.InsDate

				--LEFT JOIN dbo.InlineERPECCReqPOFirmHistory b WITH (NOLOCK)

				--ON a.Batchnumber = b.Purchaseorder AND a.Itemnumber = b.Itemnumber AND a.Color = b.Color AND a.Configuration = b.Configuration



				SELECT *

				FROM #temp_L



				SELECT *

				FROM #temp_defect



				SELECT a.Code,a.DefectEN,a.DefectVN,b.Qty,b.Itemnumber,b.Physicaldate,b.Configuration,b.Color,b.Batchnumber,b.ItemGroup

				FROM #defect a

				LEFT JOIN #temp_defect b ON a.Code = b.Code



				SELECT SUM(Quantity) Quantity,SUM(AQL) AQL,SUM(QtyDefect) QtyDefect,SUM(QtyApp) QtyApp,ROUND(SUM(PerF)/COUNT(PerF)*100,2) PerF,ROUND(SUM(PerP)/COUNT(PerP)*100,2) PerP

				INTO #Temp_L_Sum

				FROM #temp_L



				SELECT *

				FROM #Temp_L_Sum



				SELECT a.*,b.DefectEN,b.DefectVN

				INTO #Temp_Defect_Get

				FROM

				(SELECT a.InsDate,b.Code,b.Qty

				FROM #temp_L a

				INNER JOIN #temp_defect b 

				ON a.Itemnumber = b.Itemnumber AND

                b.Physicaldate = a.Physicaldate AND

                b.Color = a.Color AND

                b.Batchnumber = a.Batchnumber AND

                b.ItemGroup = a.ItemGroup) a

				INNER JOIN ADSDefectManager b WITH (NOLOCK)

				ON a.Code = b.Code



				SELECT InsDate,SUM(Quantity) QtyRcv,SUM(AQL) QtyIns,SUM(AQL) - SUM(QtyDefect) Pass,SUM(QtyDefect) Reject,ROUND(CAST(SUM(QtyDefect) AS FLOAT) / CAST(SUM(AQL) AS FLOAT),2) PerReject,ROUND(1 - ROUND(CAST(SUM(QtyDefect) AS FLOAT) / CAST(SUM(AQL) AS FLOAT)
,2),2) PerPass

				INTO #Temp_Summary_Get

				FROM #temp_L

				GROUP BY InsDate



				SELECT CAST(a.InsDate AS VARCHAR(10)) InsDate,a.QtyRcv,a.QtyIns,a.Pass,a.Reject,a.PerReject,a.PerPass,b.DefectNmEN,b.DefectNmVN 

				FROM #Temp_Summary_Get a

				LEFT JOIN (SELECT DISTINCT InsDate,

				DefectNmEN = STUFF((SELECT ',' + cast(b.DefectEN as nvarchar(1000))

				  FROM #Temp_Defect_Get b

				  WHERE a.InsDate = b.InsDate

				  FOR XML PATH (''))

				 , 1, 1, ''),

				 DefectNmVN = STUFF((SELECT ',' + cast(b.DefectVN as nvarchar(1000))

				  FROM #Temp_Defect_Get b

				  WHERE a.InsDate = b.InsDate

				  FOR XML PATH (''))

				 , 1, 1, '')

				FROM #Temp_Defect_Get a) b

				ON a.InsDate = b.InsDate

				ORDER BY a.InsDate



				--tính RFT = 100 - (t?ng s? lu?ng hu/t?ng s? lu?ng don nh?n) * 100

				SELECT ROUND(100 - (QtyDefect / Quantity) * 100,2) RFT,ROUND(100 - ROUND(100 - (QtyDefect / Quantity) * 100,2),2) PerRFT

				FROM #Temp_L_Sum



				SELECT a.Code,a.DefectEN,a.DefectVN,SUM(a.Qty) Qty

				INTO #Temp_Table_DF

				FROM

				(SELECT a.Code,a.DefectEN,a.DefectVN,b.Qty,b.Itemnumber,b.Physicaldate,b.Configuration,b.Color,b.Batchnumber,b.ItemGroup

				FROM #defect a

				LEFT JOIN #temp_defect b ON a.Code = b.Code) a

				GROUP BY a.Code,a.DefectEN,a.DefectVN

				--ORDER BY CAST(LEFT(a.Code,CHARINDEX('.',a.Code)+1) AS INT)



				SELECT Code,DefectEN,DefectVN,ISNULL(Qty,0) Qty ,(SELECT QtyDefect FROM #Temp_L_Sum) TotalD

				FROM #Temp_Table_DF

				ORDER BY RIGHT(Code,CHARINDEX('.',Code))



				DROP TABLE #temp_1,#temp_2,#temp_3,#temp_4,#temp_aql,#temp_defect,#temp_sum_defect,#defect,#temp_L

			END-- exec InlineAccGetLoadData 104,'TR','20240615','20240618','','',''



		ELSE IF @type = 105 

			BEGIN

				/*=================================================//////////*Table 4*//////////=================================================*/

				SELECT InsptDate InsDate,CreatedBy,Result,Metal,SUBSTRING(ID,0,CHARINDEX('+',ID)) Po,ID

				INTO #Temp_InsList_1

				FROM dbo.InlineAccWHInspt WITH (NOLOCK)

				WHERE Comment IS NULL AND

				Factory = 'F2' AND

				InsptDate IS NOT NULL AND

				SysCreateDate IS NOT NULL AND

				CAST(InsptDate AS DATE) >= '20230101' AND

				CAST(InsptDate AS DATE) <= '20231031'



				SELECT DISTINCT a.Itemnumber,a.Physicaldate,a.Quantity,a.Size,a.Color,a.Style,a.Batchnumber,a.ItemGroup,a.Configuration,

				a.Batchnumber+'+'+a.Itemnumber+'+'+CASE WHEN ISNULL(a.Color,'') = 'NO' THEN '' ELSE ISNULL(a.Color,'') END+'+'+CASE WHEN ISNULL(a.Size,'') = 'NO' THEN '' ELSE ISNULL(a.Size,'') END+'+'+CAST(a.Quantity AS NVARCHAR)+'+'+a.ItemGroup ID 

				INTO #Temp_Pk_1

				FROM

				(SELECT a.Itemnumber,a.Physicaldate,SUM(a.Quantity) Quantity,a.Size,a.Color,a.Style,a.Batchnumber,a.ItemGroup,a.Configuration

				FROM

				(SELECT DISTINCT b.Itemnumber,b.Physicaldate,b.Quantity,b.Size,b.Color,b.Style,b.Batchnumber,b.ItemGroup,b.Configuration

				FROM #Temp_InsList_1 a

				INNER JOIN dbo.InlineERPTransactions_Main b WITH (NOLOCK)

				ON a.Po = b.Batchnumber

				WHERE b.Reference LIKE '%Purchase%' AND

				b.Quantity > 0) a

				GROUP BY a.Itemnumber,a.Physicaldate,a.Size,a.Color,a.Style,a.Batchnumber,a.ItemGroup,a.Configuration) a



				SELECT a.InsDate,a.ID,SUM(b.Qty) Qty

				INTO #Temp_Vendor

				FROM #Temp_InsList_1 a

				LEFT JOIN dbo.InlineAccWHInsptDefct b WITH (NOLOCK) ON a.ID = b.ID

				GROUP BY a.InsDate,a.ID



				SELECT CAST(YEAR(a.InsDate) AS NVARCHAR) + '-' + CAST(MONTH(a.InsDate) AS NVARCHAR) InsDate,SUM(a.Qty) Qty,b.Configuration

				INTO #Temp_Vendor_Def

				FROM #Temp_Vendor a

				INNER JOIN #Temp_Pk_1 b ON a.ID = b.ID

				GROUP BY CAST(YEAR(a.InsDate) AS NVARCHAR) + '-' + CAST(MONTH(a.InsDate) AS NVARCHAR),b.Configuration 



				SELECT CAST(YEAR(a.InsDate) AS NVARCHAR) + '-' + CAST(MONTH(a.InsDate) AS NVARCHAR) InsDate,b.Configuration,SUM(b.Quantity) Quantity

				INTO #Temp_Vendor_Pk

				FROM #Temp_InsList_1 a

				INNER JOIN #Temp_Pk_1 b ON a.ID = b.ID

				GROUP BY CAST(YEAR(a.InsDate) AS NVARCHAR) + '-' + CAST(MONTH(a.InsDate) AS NVARCHAR),b.Configuration



				SELECT a.InsDate,a.Configuration,c.Name,ROUND((a.Quantity - ISNULL(b.Qty,0)) / a.Quantity * 100,2) RFT,CAST(SUBSTRING(a.InsDate,CHARINDEX('-',a.InsDate)+1,LEN(a.InsDate)) AS INT) Seq

				FROM #Temp_Vendor_Pk a

				LEFT JOIN #Temp_Vendor_Def b ON a.InsDate = b.InsDate AND b.Configuration = a.Configuration

				LEFT JOIN dbo.InlineERPVendor_Main c WITH (NOLOCK) ON a.Configuration = c.Vendoraccount

				ORDER BY a.Configuration,Seq

				/*=================================================//////////*END*//////////=================================================*/



				DROP TABLE #Temp_Vendor,#Temp_Vendor_Def,#Temp_Vendor_Pk,#Temp_Pk_1,#Temp_InsList_1

			END

			/*

			EXEC InlineAccGetLoadData 105,'F2','20230101','20231031','','',''

			*/

		ELSE IF @type = 106

			BEGIN

				--SELECT a.ITEMID Item,a.QTY Quantity,a.CONFIGID SupCode,a.INVENTSIZEID Size,a.INVENTCOLORID Color,a.INVENTSTYLEID StyleID,a.INVENTBATCHID PO,a.INVENTLOCATIONID Warehouse,b.Location

				--FROM

				--(SELECT ITEMID,ROUND(SUM(QTY),2) QTY,CONFIGID,INVENTSIZEID,INVENTCOLORID,INVENTSTYLEID,INVENTBATCHID,INVENTLOCATIONID

				--FROM [192.168.70.115].[AXDB].[dbo].A1A_InventTrans WITH (NOLOCK)

				--WHERE ITEMID like '%'+@dt2 AND 

				--INVENTBATCHID like '%'++@dt3 AND 

				--CHARINDEX(@dt1,INVENTLOCATIONID) > 0

				--GROUP BY ITEMID,CONFIGID,INVENTSIZEID,INVENTCOLORID,INVENTSTYLEID,INVENTBATCHID,INVENTLOCATIONID) a

				--LEFT JOIN dbo.InlineAccWHLocHis b WITH (NOLOCK) ON a.INVENTBATCHID COLLATE Chinese_Taiwan_Stroke_BIN = b.BatchNumber AND a.ITEMID COLLATE Chinese_Taiwan_Stroke_BIN = b.ItemNumber AND 

				--a.INVENTCOLORID COLLATE Chinese_Taiwan_Stroke_BIN = CASE WHEN b.Color = '' THEN 'NO' ELSE b.Color END AND

				--a.INVENTSIZEID COLLATE Chinese_Taiwan_Stroke_BIN = CASE WHEN b.Size = '' THEN 'NO' ELSE b.Size END AND b.Comment IS NULL

				--WHERE a.QTY > 0

				SELECT GETDATE()

			END

			/*

			EXEC InlineAccGetLoadData 106,'F2','80019445','','','',''

			*/



		ELSE IF @type = 107

			BEGIN

				SELECT ID,Result,CAST(MONTH(CAST(InsptDate AS DATE)) AS VARCHAR) Monthly

				INTO #Acc_1

				FROM dbo.InlineAccWHInspt

				WHERE Comment IS NULL 

				AND Factory = @dt1 

				AND InsptDate IS NOT NULL

				AND YEAR(InsptDate) = @dt2



				SELECT *,

				a.Batchnumber+'+'+a.Itemnumber+'+'+CASE WHEN LOWER(a.Color) = 'no' THEN '' ELSE a.Color END + '+' +

				CASE WHEN LOWER(a.Size) = 'no' THEN '' ELSE a.Size END + '+' + CAST(a.Quantity AS NVARCHAR) + '+' + a.ItemGroup ID

				INTO #Acc_Pklist

				FROM 

				(SELECT Itemnumber,Physicaldate,SUM(Quantity) Quantity,Unit,Configuration,Size,Color,Style,Warehouse,Batchnumber,ItemGroup

				FROM dbo.InlineERPTransactions_Main WITH (NOLOCK)

				WHERE Batchnumber IN (SELECT DISTINCT SUBSTRING(ID,0,CHARINDEX('+',ID)) FROM #Acc_1) AND ISNULL(Issue,'None') = 'None'

				GROUP BY Itemnumber,Physicaldate,Unit,Configuration,Size,Color,Style,Warehouse,Batchnumber,ItemGroup) a



				SELECT b.Name,a.Configuration,a.Monthly,CAST(a.PerDe AS NVARCHAR) + '%' PerDe,CAST(a.PerP AS NVARCHAR) + '%' PerP,a.Level

				INTO #Acc_Temp

				FROM

				(SELECT *,

				CASE WHEN a.PerP >= 98 THEN 'A'

				WHEN a.PerP >= 95 AND a.PerP <= 97.9 THEN 'B'

				WHEN a.PerP <= 94.9 THEN 'C'

				ELSE '' END Level

				FROM

				(SELECT *,ROUND(CAST(a.QtyIns AS FLOAT) / CAST(QtyRcv AS FLOAT) * 100,2) PerDe,100 - ROUND(CAST(a.QtyIns AS FLOAT) / CAST(QtyRcv AS FLOAT) * 100,2) PerP

				FROM

				(SELECT a.Configuration,SUM(a.Quantity) QtyRcv,SUM(ISNULL(c.Qty,0)) QtyIns,b.Monthly

				FROM #Acc_Pklist a

				INNER JOIN #Acc_1 b ON a.ID = b.ID

				LEFT JOIN dbo.InlineAccWHInsptDefct c WITH (NOLOCK)

				ON b.ID = c.ID

				GROUP BY a.Configuration,b.Monthly) a) a) a

				LEFT JOIN dbo.InlineERPVendor_Main b WITH (NOLOCK)

				ON a.Configuration = b.Vendoraccount



				/*T1*/

				SELECT *

				INTO #Acc_T1

				FROM #Acc_Temp

				WHERE Monthly = 1



				/*T2*/

				SELECT *

				INTO #Acc_T2

				FROM #Acc_Temp

				WHERE Monthly = 2



				/*T3*/

				SELECT *

				INTO #Acc_T3

				FROM #Acc_Temp

				WHERE Monthly = 3



				/*T4*/

				SELECT *

				INTO #Acc_T4

				FROM #Acc_Temp

				WHERE Monthly = 4



				/*T5*/

				SELECT *

				INTO #Acc_T5

				FROM #Acc_Temp

				WHERE Monthly = 5



				/*T6*/

				SELECT *

				INTO #Acc_T6

				FROM #Acc_Temp

				WHERE Monthly = 6



				/*T7*/

				SELECT *

				INTO #Acc_T7

				FROM #Acc_Temp

				WHERE Monthly = 7



				/*T8*/

				SELECT *

				INTO #Acc_T8

				FROM #Acc_Temp

				WHERE Monthly = 8



				/*T9*/

				SELECT *

				INTO #Acc_T9

				FROM #Acc_Temp

				WHERE Monthly = 9



				/*T10*/

				SELECT *

				INTO #Acc_T10

				FROM #Acc_Temp

				WHERE Monthly = 10



				/*T11*/

				SELECT *

				INTO #Acc_T11

				FROM #Acc_Temp

				WHERE Monthly = 11



				/*T12*/

				SELECT *

				INTO #Acc_T12

				FROM #Acc_Temp

				WHERE Monthly = 12



				SELECT a.Name,'AQL 1.0' AQL

				,b.PerDe D1,b.PerP P1,b.Level T1

				,b1.PerDe D2,b1.PerP P2,b1.Level T2

				,b2.PerDe D3,b2.PerP P3,b2.Level T3

				,b3.PerDe D4,b3.PerP P4,b3.Level T4

				,b4.PerDe D5,b4.PerP P5,b4.Level T5

				,b5.PerDe D6,b5.PerP P6,b5.Level T6

				,b6.PerDe D7,b6.PerP P7,b6.Level T7

				,b7.PerDe D8,b7.PerP P8,b7.Level T8

				,b8.PerDe D9,b8.PerP P9,b8.Level T9

				,b9.PerDe D10,b9.PerP P10,b9.Level T10

				,b10.PerDe D11,b10.PerP P11,b10.Level T11

				,b11.PerDe D12,b11.PerP P12,b11.Level T12

				FROM 

				(SELECT DISTINCT Name,Configuration

				FROM #Acc_Temp) a

				LEFT JOIN #Acc_T1 b ON a.Configuration = b.Configuration

				LEFT JOIN #Acc_T2 b1 ON a.Configuration = b1.Configuration

				LEFT JOIN #Acc_T3 b2 ON a.Configuration = b2.Configuration

				LEFT JOIN #Acc_T4 b3 ON a.Configuration = b3.Configuration

				LEFT JOIN #Acc_T5 b4 ON a.Configuration = b4.Configuration

				LEFT JOIN #Acc_T6 b5 ON a.Configuration = b5.Configuration

				LEFT JOIN #Acc_T7 b6 ON a.Configuration = b6.Configuration

				LEFT JOIN #Acc_T8 b7 ON a.Configuration = b7.Configuration

				LEFT JOIN #Acc_T9 b8 ON a.Configuration = b8.Configuration

				LEFT JOIN #Acc_T10 b9 ON a.Configuration = b9.Configuration

				LEFT JOIN #Acc_T11 b10 ON a.Configuration = b10.Configuration

				LEFT JOIN #Acc_T12 b11 ON a.Configuration = b11.Configuration



				DROP TABLE #Acc_1,#Acc_Pklist,#Acc_Temp,#Acc_T1,#Acc_T2,#Acc_T3,#Acc_T4,#Acc_T5,#Acc_T6,#Acc_T7,#Acc_T8,#Acc_T9,#Acc_T10,#Acc_T11,#Acc_T12



			END

			/*

			EXEC InlineAccGetLoadData 107,'F4','2023','','','',''

			*/

	end

	execute sp_executesql @sql

end



/*

select * from InlineAccWHLocHis order by SysCreateDate desc



select * from InlineAccWHIssue order by SysCreateDate desc

select * from InlineAccWHInspt where ID = 'POAD000005804+60005437-MU H COLLAR KIT+001A/A2QN/095A+5.7X32CM+1040+RFB' order by SysCreateDate desc



select * from InlineQcKanban where JobNo like '%00438' and FacLine = 'F2A28'



alter table InlineAccWHIssue add PONo nvarchar(20)



exec InlineAccGetLoadData 11,'','','','','',''

*/

