CREATE proc [dbo].[InlineFBGetData]
@i int,
@dt1 nvarchar(max),
@dt2 nvarchar(max),
@dt3 nvarchar(max),
@dt4 nvarchar(max),
@dt5 nvarchar(max),
@dt6 nvarchar(max),
@dt7 nvarchar(max),
@dt8 nvarchar(max),
@dt9 nvarchar(max)
as
begin
	declare @sql nvarchar(max);
	begin
		if(@i=0)-- exec InlineFBGetData 0,'9b0b8116bfcae18d155dbfe9a5443fb6','','','','','','','',''
			begin
				select distinct a.QrCode,b.RollNameID Roll from
				(select QrCode from InlineFBWHPkList where QrCode = @dt1) a left join InlineFBRollDataDtl b on a.QrCode = b.RollNameID 
			end
		else if(@i=1)-- exec InlineFBGetData 1,'9b0b8116bfcae18d155dbfe9a5443fb6','','','','','','','',''
			begin
				select distinct QrCode into #t from InlineFBWHPkList where QrCode = @dt1
				exec sp_InlineFBUpdateNWFromTempTable @dt2,#t,@dt3
			end
		else if(@i=2)-- exec InlineFBGetData 2,'9b0b8116bfcae18d155dbfe9a5443fb6','','','','','','','',''
			begin
				--0
				select distinct a.InvoiceNo,a.SupCode,a.QrCode,a.OrderNumber,a.RollItem,a.Color,a.BatchNo,a.RollNo,a.ShipLength,a.Width,a.NW,a.GW,b.ItemMoisture,
				case when charindex('G/SQM',c.Productname) > 0 then reverse(substring(reverse(substring(c.Productname,1,charindex('G/S',c.Productname)-1)),1,charindex(' ',reverse(substring(c.Productname,1,charindex('G/S',c.Productname)-1))))) else '' end GSM,
				d.RollLocation
				from
				(select * from InlineFBWHPkList where QrCode = @dt1) a left join InlineFBStandardMoisture b on charindex(b.ItemCode,a.RollItem) > 0
				left join InlineERPRealesedproducts_# c on charindex(a.RollItem,c.Itemnumber) > 0
				left join InlineFBRollDataDtl d on a.QrCode = d.RollNameID
				--1
				select * from InlineFBRollInspt where RollNameID = @dt1
				--2
				select b.DefectCode,b.DefectName,b.Desc1,cast(a.QtyDefect as int) QtyDefect,cast(a.DefectPoint as int) DefectPoint,a.PicLink,a.YrdsDefect from
				(select * from InlineFBRollInsptDefct where RollNameID = @dt1) a inner join InlineFBDefect b on a.DefectCode = b.DefectCode
			end
		else if(@i=3)-- exec InlineFBGetData 3,'9b0b8116bfcae18d155dbfe9a5443fb6','','','','','','','',''
			begin
				insert into InlineFBRollInspt(RollNameID,InsptDate,InsptWeight,CreatedBy,Fac,ColorApp,Handfeel,InsptReslt,InsptReltPer,Standard_Moisture) values (@dt1,getdate(),@dt2,@dt3,@dt4,1,1,'P','0',@dt5)
			end
		else if(@i=4)-- exec InlineFBGetData 4,'9b0b8116bfcae18d155dbfe9a5443fb6','','','','','','','',''
			begin
				delete from InlineFBRollInspt where RollNameID = @dt1
				delete from InlineFBRollInsptDefct where RollNameID = @dt1
			end
		else if(@i=5)-- exec InlineFBGetData 5,'wb','','9b0b8116bfcae18d155dbfe9a5443fb6','','','','','',''
			begin
				if(@dt1='wb')
					begin
						update InlineFBRollInspt set InsptWidthB = @dt2,InsptWidthEx=round((isnull(InsptWidthB,0)+isnull(InsptWidthM,0)+isnull(InsptWidthE,0))/3,0),RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='wm')
					begin
						update InlineFBRollInspt set InsptWidthM = @dt2,InsptWidthEx=round((isnull(InsptWidthB,0)+isnull(InsptWidthM,0)+isnull(InsptWidthE,0))/3,0),RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='we')
					begin
						update InlineFBRollInspt set InsptWidthE = @dt2,InsptWidthEx=round((isnull(InsptWidthB,0)+isnull(InsptWidthM,0)+isnull(InsptWidthE,0))/3,0),RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='ya')
					begin
						update InlineFBRollInspt set InsptLenght = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='ms')
					begin
						update InlineFBRollInspt set Actual_Measured_Moisture = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='gsm')
					begin
						update InlineFBRollInspt set GSM = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='distance')
					begin
						update InlineFBRollInspt set Distance_2stripes = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='cyclestandard')
					begin
						update InlineFBRollInspt set CycleStandard = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='cycleac')
					begin
						update InlineFBRollInspt set CycleActual = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='cyclenum')
					begin
						update InlineFBRollInspt set CycleNumber = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='cyclehori')
					begin
						update InlineFBRollInspt set CicleHorizontal = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='cyclever')
					begin
						update InlineFBRollInspt set CicleVertical = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='color')
					begin
						update InlineFBRollInspt set ColorApp = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					end
				else if(@dt1='handfeel')
					begin
						update InlineFBRollInspt set Handfeel = @dt2,RecoredDate = getdate() where RollNameID = @dt3
					END
                ELSE IF @dt1 = 'odortest'
					BEGIN
						UPDATE dbo.InlineFBRollInspt SET OdorTest = @dt2,RecoredDate = GETDATE() WHERE RollNameID = @dt3
					END
				else if(@dt1='deldf')
					begin
						delete from InlineFBRollInsptDefct where RollNameID = @dt2 and DefectCode = @dt3 and DefectPoint = @dt4
					end
				else if(@dt1='changeqty')
					begin
						update InlineFBRollInsptDefct set QtyDefect = @dt5 where RollNameID = @dt2 and DefectCode = @dt3 and DefectPoint = @dt4
					end
				else if(@dt1='uppallet')
					begin
						update InlineFBRollInspt set RollGroup = @dt3 where RollNameID = @dt2
						update InlineFBRollDataDtl set RollLocation = @dt3 where RollNameID = @dt2
						insert into InlineFBRollLocHis(RollNameID,PalletCode,RecoredDate,CreatedBy,Fac) values (@dt2,@dt3,getdate(),@dt4,@dt5)
					end
				else if(@dt1='delalldf')
					begin
						delete from InlineFBRollInsptDefct where RollNameID = @dt2
					end
				else if(@dt1='uppoint')
					begin
						update InlineFBRollInspt set InsptReslt = @dt3,InsptReltPer = @dt4 where RollNameID = @dt2
					end
				else if(@dt1='upimgreport')
					begin
						update InlineFBRollInspt set ImgRp = case when ImgRp <> '' then ImgRp + ',' + @dt3 else @dt3 end where RollNameID = @dt2
					end
				else if(@dt1='upnote')
					begin
						update InlineFBRollInspt set Note = @dt3 where RollNameID = @dt2
					end
				else if(@dt1='updatelocationqc')
					begin
							set @sql = 'update InlineFBRollDataDtl set RollLocation = @dt2 where RollNameID in (select QrCode from ' + quotename(@dt3) + ') ' +
							' insert into InlineFBRollLocHis(QrCode,PalletCode,RecoredDate,CreatedBy,Fac) select QrCode,''+@dt2+'',getdate(),''' + @dt4 + ''',''' + @dt5 + '' +
							' drop table ' + quotename(@dt3)
					end
			end
		else if(@i=6)-- exec InlineFBGetData 6,'9b0b8116bfcae18d155dbfe9a5443fb6','1','DF0001','','','','','',''
			begin
				declare @d int; set @d = (select count(RollNameID) from InlineFBRollInsptDefct where RollNameID = @dt1 and DefectPoint = @dt2 and DefectCode = @dt3)
				if(@d>0)
					begin
						if(@dt6<>'')
							begin
								declare @img nvarchar(255);set @img=(select PicLink from InlineFBRollInsptDefct where RollNameID = @dt1 and DefectPoint = @dt2 and DefectCode = @dt3)
								if(@img='')
									begin
										update InlineFBRollInsptDefct set QtyDefect = QtyDefect+1,YrdsDefect = @dt5,PicLink = @dt6 where RollNameID = @dt1 and DefectPoint = @dt2 and DefectCode = @dt3
									end
								else
									begin
										update InlineFBRollInsptDefct set QtyDefect = QtyDefect+1,YrdsDefect = @dt5,PicLink = @img+','+@dt6 where RollNameID = @dt1 and DefectPoint = @dt2 and DefectCode = @dt3
									end
							end
						else
							begin
								update InlineFBRollInsptDefct set QtyDefect = QtyDefect+1,YrdsDefect = @dt5 where RollNameID = @dt1 and DefectPoint = @dt2 and DefectCode = @dt3
							end
					end
				else
					begin
						insert into InlineFBRollInsptDefct(RollNameID,DefectCode,QtyDefect,DefectPoint,PicLink,RecoredDate,CreatedBy,Fac,YrdsDefect)
						values(@dt1,@dt3,@dt4,@dt2,@dt6,getdate(),@dt7,@dt8,@dt5)
					end
			end
		else if(@i=7)-- exec InlineFBGetData 7,'9b0b8116bfcae18d155dbfe9a5443fb6','','','','','','','',''
			begin
				select b.DefectCode,b.DefectName,b.Desc1,a.QtyDefect,a.DefectPoint,a.PicLink,a.YrdsDefect from
				(select * from InlineFBRollInsptDefct where RollNameID = @dt1) a inner join InlineFBDefect b on a.DefectCode = b.DefectCode
			end
		else if(@i=8)-- exec InlineFBGetData 8,'Shieu','','','','','','','',''
			begin
				select a.*,(select RollLocation from InlineFBRollDataDtl where RollNameID = a.QrCode) Location from
				(select convert(varchar(10),a.InsptDate,120) InsptDate,b.InvoiceNo,b.OrderNumber FBPONo,b.SupCode,b.RollItem,b.Color,b.BatchNo LOT,b.RollNo,b.ShipLength,b.Width,b.QrCode,a.RollGroup,a.InsptReslt Status,isnull(a.InsptReltPer,0) PointAvg from
				(select * from InlineFBRollInspt where CreatedBy = @dt1) a
				inner join InlineFBWHPkList b on a.RollNameID = b.QrCode) a order by a.InsptDate desc
			end
		else if(@i=9)-- exec InlineFBGetData 9,'F3','','','','','','','',''
			begin
				select distinct ltrim(rtrim(Note)) Note from InlineFBRollInspt where Fac = @dt1 and Note is not null 
			end
		else if(@i=10)-- exec InlineFBGetData 10,'9b0b8116bfcae18d155dbfe9a5443fb6','','','','','','','',''
			begin
				select a.*,b.DefectName,b.Desc1 from InlineFBRollInsptDefct a inner join InlineFBDefect b on a.DefectCode	 = b.DefectCode  where RollNameID = @dt1
			end
		else if(@i=11)-- exec InlineFBGetData 11,'F2','','','','','','','',''
			begin
				select a.ShNm,b.ShLevl,c.ShSeq,c.DmH,c.DmW,c.MgnL,c.MgnT,c.ShSeqId from
				(select * from InlineWHLocSh1Nm 
				where FacId = (select FacId from InlineWHFacMgnt where FacId = (select FacId from InlineWHComMgnt where FacCode = @dt1) and SectionId = 1) and 
				SectionId = (select SectionId from InlineWHFacMgnt where FacId = (select FacId from InlineWHComMgnt where FacCode = @dt1) and SectionId = 1)) a
				inner join InlineWHLocSh2Levl b on a.ShId = b.ShId
				inner join InlineWHLocSh3Seq c on b.ShLevlId = c.ShLevelId
				order by a.ShNm,cast(b.ShLevl as int),cast(c.ShSeq as int)
			end
		else if(@i=12)-- exec InlineFBGetData 12,'9b0b8116bfcae18d155dbfe9a5443fb6','','','','','','','',''
			begin
				select ImgRp from InlineFBRollInspt where RollNameID = @dt1
			end
		else if(@i=13)-- exec InlineFBGetData 13,'F2','','','','','','','',''
			begin
				--select distinct a.InvoiceNo,a.OrderNumber,a.RollItem,a.Color,a.BatchNo,a.RollNo,a.Qc,b.FoC_ExYrds,isnull(b.RollLocation,'') RollLocation,c.RollNameID,a.QrCode
				----into #t1
				--from InlineFBWHPkList a 
				--inner join InlineFBRollDataDtl b on a.QrCode = b.RollNameID
				--left join InlineFBRollRelx c on a.QrCode = c.RollNameID
				--where b.Fac = @dt1 and b.OK = 0


				select b.InvoiceNo,b.OrderNumber,b.RollItem,b.Color,b.BatchNo,b.RollNo,b.Qc,cast(a.FoC_ExYrds as float) FoC_ExYrds,replace(isnull(a.RollLocation,''),char(10),'')  RollLocation,a.RollNameID,b.QrCode
				from
				(select distinct RollNameID,isnull(RollLocation,'') RollLocation,FoC_ExYrds
				from InlineFBRollDataDtl where Fac = @dt1 and OK = 0) a
				inner join InlineFBWHPkList  b on a.RollNameID = b.QrCode
				--group by b.InvoiceNo,b.OrderNumber,b.RollItem,b.Color,b.BatchNo,b.RollNo,b.Qc,a.FoC_ExYrds,isnull(a.RollLocation,''),a.RollNameID,b.QrCode
				--group by a.InvoiceNo,a.OrderNumber,a.RollItem,a.Color,a.BatchNo,a.RollNo,a.Qc,b.FoC_ExYrds,isnull(b.RollLocation,''),c.RollNameID,a.QrCode

				--select InvoiceNo,OrderNumber,RollItem,Color,BatchNo,RollNo,
				--case when isnull(Qc,'') = '*' and isnull(RollNameID,'') = '' then '*' 
				--else case when  isnull(Qc,'') = '*' and isnull(RollNameID,'') <> '' then '1'
				--else case when isnull(Qc,'') = '' and isnull(RollNameID,'') <> '' then '2'
				--else ''
				--end end end Qc,
				--cast(FoC_ExYrds as float) FoC_ExYrds,RollLocation,QrCode
				--into #tT
				--from #t1

				--select RollLocation,Qc 
				--into #ta
				--from #tT where RollLocation <> '' order by RollLocation

				--select * from #tT
				--select RollLocation,stuff((select ',' + Qc from #ta c1 where c1.RollLocation = c2.RollLocation for xml path('')),1,1,'') as Qc from #ta c2 group by RollLocation order by RollLocation

				select '' RollLocation,null Qc

				--drop table #tT,#ta
			end
		else if(@i=14)--exec InlineFBGetData 14,'A1-01','InlineChangePallet_F2_yyyyMMddHHmmss','Shieu','F2','','','','',''
			begin
				declare @sql1 nvarchar(max);
				begin
					set @sql1 = 'update InlineFBRollDataDtl set RollLocation = ''' + @dt1 + ''' where RollNameID in (select QrCode from ' + quotename(@dt2) + ') ' +
					'insert into InlineFBRollLocHis(RollNameID,PalletCode,RecoredDate,CreatedBy,Fac) select QrCode,''' + @dt1 + ''',getdate(),''' + @dt3 + ''',''' + @dt4 + ''' from ' +quotename(@dt2) +
					' drop table ' + quotename(@dt2)
				end
				execute sp_executesql @sql1
			end
		else if(@i=15)--exec InlineFBGetData 15,'F2','','','','','','','',''
			begin
				select OrderNumber,SupCode,InvoiceNo,QrCode,RollItem,Color,BatchNo,RollNo,ShipLength,Qc
				into #tta
				from InlineFBWHPkList where Factory = @dt1 and SysCreateDate >= dateadd(month,-2,getdate())

				select InvoiceNo,SupCode,OrderNumber,RollItem,Color,count(QrCode) Roll,sum(cast(ShipLength as float)) Yard from #tta
				group by InvoiceNo,SupCode,OrderNumber,RollItem,Color

				select * from #tta
			end
		else if(@i=16)--exec InlineFBGetData 16,'F2','','','','','','','',''
			begin
				select RollNo,a.InvoiceNo,a.OrderNumber,a.RollItem,a.Color,b.FoC_ExYrds Yrds,b.RollLocation,a.QrCode from InlineFBWHPkList a inner join InlineFBRollDataDtl b on a.QrCode = b.RollNameID
				where b.Fac = @dt1 and b.OK = 0
				group by a.InvoiceNo,a.OrderNumber,a.RollItem,a.Color,b.FoC_ExYrds,RollNo,b.RollLocation,a.QrCode
			end
		else if(@i=17)--exec InlineFBGetData 17,'F2','','','','','','','',''
			begin
				set @sql = 'update InlineFBRollDataDtl set OK = 1 where RollNameID in (select QrCode from '+quotename(@dt1)+') '+
				'select a.QrCode,a.ShipLength into #t1 from InlineFBWHPkList a inner join '+quotename(@dt1)+' b on a.QrCode = b.QrCode '+
				'insert into InlineFBRollOutput(job,rollnameid,yrds,dateout,fac,createdby) select '''+@dt4+''',QrCode,ShipLength,getdate(),'''+@dt2+''','''+@dt3+''' from #t1 '--+
				--'drop table '+quotename(@dt1)
			end
		else if(@i=18)--exec InlineFBGetData 18,'F2','','','','','','','',''
			begin
				set @sql = 'update InlineFBRollDataDtl set RollLocation = '''+@dt2+''' where RollNameID in (select QrCode from '+quotename(@dt1)+') '+
				'insert into InlineFBRollLocHis(RollNameID,PalletCode,RecoredDate,CreatedBy,Fac) select QrCode,'''+@dt2+''',getdate(),'''+@dt3+''','''+@dt4+''' from '+quotename(@dt1)+
				' drop table '+quotename(@dt1)
			end
		else if(@i=19)--exec InlineFBGetData 19,'DF009','20221102','20221102','F2','','','','',''
			begin
				select b.RollItem,a.* into #t1t from 
				(select * from InlineFBRollInsptDefct where DefectCode = @dt1 and RecoredDate between @dt2 and dateadd(day, 1, @dt3) and Fac = @dt4) a 
				inner join InlineFBWHPkList b on a.RollNameID = b.QrCode 
				select * from #t1t
				select RollItem, Point from(select RollItem, sum(QtyDefect * DefectPoint) Point from #t1t group by RollItem) a order by Point desc 
				drop table #t1t
			end
		else if(@i=20)-- exec InlineFBGetData 20,'F2','20221108','','','','','','',''
			begin
				select distinct a.InsptDate,b.OrderNumber,RollItem,Color,SupCode,Width
				from
				(select convert(varchar(10),InsptDate,120) InsptDate,RollNameID 
				from InlineFBRollInspt
				where convert(varchar(8),InsptDate,112) = @dt2 and Fac = @dt1 and RecoredDate is not null) a
				inner join InlineFBWHPkList b on a.RollNameID = b.QrCode
			end
		else if(@i=21)-- exec InlineFBGetData 21,'F2','20221108','POAD000011220','70025524','57F0/001A','PROMAX','','',''
			begin
				--declare @dt1 nvarchar(max),@dt2 nvarchar(max),@dt3 nvarchar(max),@dt4 nvarchar(max),@dt5 nvarchar(max),@dt6 nvarchar(max);
				--set @dt1='F1' set @dt2='20221109' set @dt3='POPU0002736' set @dt4='CK-101-04-00067' set @dt5=N' PUMA RED 485C' set @dt6=N'CRYSTAL ELEGANCE TEXTILES VIETNAM COMPANY LIMITE' 

				select convert(varchar(10),InsptDate,120) InsptDate,RollNameID,InsptLenght,InsptWidthE,InsptReslt,InsptReltPer,CreatedBy 
				into #a1
				from InlineFBRollInspt 
				where convert(varchar(8),InsptDate,112) = @dt2 and Fac = @dt1 and RecoredDate is not null

				select a.*,DefectPoint,b.DefectCode,sum(QtyDefect) Point 
				into #a2
				from #a1 a 
				left join InlineFBRollInsptDefct b on a.RollNameID = b.RollNameID
				group by a.InsptDate,a.RollNameID,a.InsptLenght,a.InsptWidthE,a.InsptReslt,a.InsptReltPer,a.CreatedBy,b.DefectPoint,b.DefectCode

				select b.BatchNo,b.ShipLength,b.RollNo,b.Width,a.InsptDate,a.RollNameID,a.InsptLenght,a.InsptWidthE,a.InsptReslt,a.InsptReltPer,a.CreatedBy,a.DefectPoint,sum(Point) Point
				into #a3
				from #a2 a
				inner join InlineFBWHPkList b on a.RollNameID = b.QrCode
				where b.OrderNumber = @dt3 and b.RollItem = @dt4 and b.Color = @dt5 and b.SupCode = @dt6
				group by b.BatchNo,b.ShipLength,b.RollNo,b.Width,a.InsptDate,a.RollNameID,a.InsptLenght,a.InsptWidthE,a.InsptReslt,a.InsptReltPer,a.CreatedBy,a.DefectPoint
				--order by b.OrderNumber,b.RollItem,b.Color,b.BatchNo

				select * from #a3

				select * 
				from
				(select * 
				from InlineFBRollInsptDefct where RollNameID in (select RollNameID from #a3))a
				left join InlineFBDefect b on a.DefectCode = b.DefectCode

				select top 1 * from
				(select BatchNo,ShipLength,RollNo,Width,InsptLenght,InsptWidthE,InsptReltPer,sum(DefectPoint*Point) Point from #a3
				group by BatchNo,ShipLength,RollNo,Width,InsptLenght,InsptWidthE,InsptReltPer) a order by Point desc

				drop table #a1,#a2,#a3
			end
		else if(@i=22)
			begin
				if(@dt1='Ad')
					begin
						select distinct Fac,FBPONo,FBItemNo,OriBatchNo,OriRollNo,OriLenght,OriWidth,OriWeight,FoC_ExYrds,RollNameID,FBGrssW,Pass,Note,RollGroup,RollLocation,Comment 
						into #temp
						from InlineFBRollDataDtl 
						where OK = 0

						select RollNameID,PalletCode,max(RecNo) RecNo,CreatedBy
						into #temp1
						from InlineFBRollLocHis
						where RollNameID in (select RollNameID from #temp)
						group by RollNameID,PalletCode,CreatedBy
						order by RollNameID

						WITH cte AS (
							SELECT
								RollNameID, 
								ROW_NUMBER() OVER (
									PARTITION BY
										RollNameID
									ORDER BY
										RollNameID
								) row_num
							 FROM
								#temp1
						)
						DELETE FROM cte
						WHERE row_num > 1;

						select a.*,b.CreatedBy Modifier
						into #tPk
						from #temp a
						left join #temp1 b on a.RollNameID = b.RollNameID

						select distinct cast(b.InvoiceDate as nvarchar) RcvDate,b.InvoiceNo,b.SupCode,b.OrderNumber,b.RollItem,reverse(substring(reverse(b.Color) + ' ',0,charindex(' ',reverse(b.Color) + ' '))) + ' ' + reverse(substring(reverse(b.Color) + ' ',charindex(' ',reverse(b.Color) + ' '),len(reverse(b.Color) + ' '))) Color,char(39) + b.BatchNo BatchNo,b.RollNo,b.ShipLength,round(cast(a.FoC_ExYrds as float),2) FoC_ExYrds,b.Width,b.Qc,a.RollLocation,a.Modifier,case when Pass = 'P' then 'OK' else Pass end 'Pass Roll of QC',a.RollGroup 'Group',Note Remarks,case when lower(c.Description) like '%rec%' then 'Recycled' else '' end Recycle,b.QrCode,b.TranferSupp,a.Fac Factory
						from #tPk a inner join InlineFBWHPkList b on a.RollNameID = b.QrCode
						left join SecurityReport.dbo.puoitem c on substring(b.OrderNumber,1,14) = substring(c.PuOrderNo collate SQL_Latin1_General_CP1_CI_AS,1,14) and b.RollItem = c.MatrCode collate SQL_Latin1_General_CP1_CI_AS

						drop table #temp,#temp1,#tPk
					end
				else if(@dt1<>'Ad' and @dt2<>'')
					begin
						select distinct Fac,FBPONo,FBItemNo,OriBatchNo,OriRollNo,OriLenght,OriWidth,OriWeight,FoC_ExYrds,RollNameID,FBGrssW,Pass,Note,RollGroup,RollLocation,Comment 
						into #tempp
						from InlineFBRollDataDtl 
						where Fac = @dt1 and OK = 0

						select RollNameID,PalletCode,max(RecNo) RecNo,CreatedBy
						into #tempp1
						from InlineFBRollLocHis
						where RollNameID in (select RollNameID from #tempp)
						group by RollNameID,PalletCode,CreatedBy
						order by RollNameID

						WITH cte AS (
							SELECT
								RollNameID, 
								ROW_NUMBER() OVER (
									PARTITION BY
										RollNameID
									ORDER BY
										RollNameID
								) row_num
							 FROM
								#tempp1
						)
						DELETE FROM cte
						WHERE row_num > 1;

						select a.*,b.CreatedBy Modifier
						into #tPk1
						from #tempp a
						left join #tempp1 b on a.RollNameID = b.RollNameID

						select distinct cast(b.InvoiceDate as nvarchar) RcvDate,b.InvoiceNo,b.SupCode,b.OrderNumber,b.RollItem,reverse(substring(reverse(b.Color) + ' ',0,charindex(' ',reverse(b.Color) + ' '))) + ' ' + reverse(substring(reverse(b.Color) + ' ',charindex(' ',reverse(b.Color) + ' '),len(reverse(b.Color) + ' '))) Color,char(39) + b.BatchNo BatchNo,b.RollNo,b.ShipLength,round(cast(a.FoC_ExYrds as float),2) FoC_ExYrds,b.Width,b.Qc,a.RollLocation,a.Modifier,case when Pass = 'P' then 'OK' else Pass end 'Pass Roll of QC',a.RollGroup 'Group',Note Remarks,case when lower(c.Description) like '%rec%' then 'Recycled' else '' end Recycle,b.QrCode,b.TranferSupp,a.Fac Factory 
						from #tPk1 a inner join InlineFBWHPkList b on a.RollNameID = b.QrCode
						left join SecurityReport.dbo.puoitem c on substring(b.OrderNumber,1,14) = substring(c.PuOrderNo collate SQL_Latin1_General_CP1_CI_AS,1,14) and b.RollItem = c.MatrCode collate SQL_Latin1_General_CP1_CI_AS
						
						drop table #tempp,#tempp1,#tPk1
					end
			end -- exec InlineFBGetData 22,'F2','9','','','','','','',''
        else if(@i=23)
            BEGIN
                set @sql = 'insert into InlineFBT2Report(SupCode,Item,Color,ID,SysCreateDate) 
                                values ('''+@dt3+''','''+@dt4+''','''+@dt5+''','''+@dt2+''',getdate())
                                insert into InlineFBT2ReportRs(ID,Method,FabricTech,Composition,TestStandard,MiniRequire,TestRs,TestDetail,A,R) 
                                select '''+@dt2+''',Method,FabricTech,Composition,TestStandard,MiniRequire,TestRs,TestDetail,A,R from '+quotename(@dt1) +' 
                                drop table '+quotename(@dt1) 
            END-- exec InlineFBGetData 23,'F2','9','','','','','','',''
        else if(@i=24)
            begin
                select distinct SupCode,RollItem,Color from DtradeProduction.dbo.InlineFBWHPkList where ISNULL(SupCode,'') <> ''
            END-- exec InlineFBGetData 24,'','','','','','','','',''
		ELSE IF @i = 25
			BEGIN
				SELECT SupCode,Item,Color,ID,SysCreateDate
				FROM dbo.InlineFBT2Report
				ORDER BY SysCreateDate DESC

				SELECT *
				FROM dbo.InlineFBT2ReportRs
			END
			/*
			EXEC InlineFBGetData 25,'','','','','','','','',''
			*/

		ELSE IF @i =26
			BEGIN
			 DELETE FROM InlineFBT2Report WHERE ID = @dt1
			 DELETE FROM InlineFBT2ReportRs WHERE ID = @dt1
			END
			/*
			EXEC InlineFBGetData 26,'ID','','','','','','','',''
			*/

		end
		exec sp_executesql @sql
	end
	--select * from InlineFBRollLocHis
