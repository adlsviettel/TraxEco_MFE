CREATE proc [dbo].[InlineFGsWHPlanLoad_Cust_v2]  -- exec InlineFGsWHPlanLoad_Cust '20251016','Puma'
@MCutOfTime NVARCHAR(10),
@Cust NVARCHAR(10)
AS
BEGIN
IF(@Cust = 'Adidas')
BEGIN
SELECT DISTINCT CAST(LotRef AS NVARCHAR(50)) AS LotRef
INTO #TempA_Filter
FROM dbo.saoship WITH(NOLOCK)
WHERE CAST(ShipDate AS DATE) >= DATEADD(DAY,-365,GETDATE()) AND LotRef <> '' AND ShipDest <> 'TES' AND LEFT(OrderNo,4) = 'SOAD'
--#TempA
SELECT y.PONo,y.CTNSeriNo,y.PlanRefNo--,cast(cast(CTNL as float) * 1000 as varchar) + cast(cast(CTNW as float) * 1000 as varchar) + cast(cast(CTNH as float) * 1000 as varchar) CTNSize
INTO #TempA
FROM InlineFGsWHPkList y  WITH(NOLOCK)
INNER JOIN #TempA_Filter fy ON y.PONo = fy.LotRef
WHERE y.SysCreateDate > DATEADD(DAY,-180,GETDATE()) --(LEFT(y.PONo,2) = '45' OR LEFT(PONo,1) <> '4')
SELECT DISTINCT CAST(LotRef AS NVARCHAR(50)) AS LotRef
INTO #TempB_Filter
FROM dbo.saoship WITH(NOLOCK)
WHERE CAST(ShipDate AS DATE) >= DATEADD(DAY,-365,GETDATE()) AND LotRef <> '' AND ShipDest <> 'TES' AND LEFT(OrderNo,4) = 'SOAD'
--#TempB
SELECT p.PONo, p.CTNBarCode, p.CTNSeriNo,p.Factory
INTO #TempB
FROM InlineFGsWHCTNMaster p  WITH(NOLOCK)
INNER JOIN #TempB_Filter fp ON p.PONo = fp.LotRef
WHERE ShipStatus IS NULL AND p.ReScan IS NULL--AND LEFT(p.PONo,1) <> '4'
--#TempC
SELECT k.PONo, k.Final, k.Comment1, k.Comment2, k.RecNo INTO #TemC FROM
(
SELECT p.* ,ROW_NUMBER() OVER(PARTITION BY p.PONo ORDER BY p.RecNo DESC) Rnum FROM
(
SELECT TOP 2000 * FROM InlineFGsWHFinCMT WITH(NOLOCK) ORDER BY RecNo DESC
) p
) k
WHERE Rnum = 1 --and k.PONo ='126129044'
SELECT DISTINCT CAST(LotRef AS NVARCHAR(50)) AS LotRef
INTO #TempE_Filter
FROM dbo.saoship WITH(NOLOCK)
WHERE CAST(ShipDate AS DATE) >= DATEADD(DAY,-180,GETDATE()) AND LotRef <> '' AND ShipDest <> 'TES' AND LEFT(OrderNo,4) = 'SOAD'
--#TempE
SELECT DISTINCT a.PONo, a.PlanRefNo AS LogNo, b.RecNo,b.Factory--,cast(cast(a.CTNL as float) * 1000 as varchar) + cast(cast(a.CTNW as float) * 1000 as varchar) + cast(cast(a.CTNH as float) * 1000 as varchar) CTNSize
INTO #TempE
FROM InlineFGsWHPkList a WITH(NOLOCK), InlineFGsWHCTNMaster b WITH(NOLOCK), #TempE_Filter fa
WHERE b.SysCreateDate > DATEADD(YEAR,-1,GETDATE()) AND b.ShipStatus IS NULL /*AND b.ShipStatus != 'del' AND b.ShipStatus != 'Rv'*/ AND a.CTNSeriNo = b.CTNSeriNo--and a.PONo = b.PONo
AND a.PONo = fa.LotRef--AND LEFT(a.PONo,1) <> '4'
--#TempH
--declare @MCutOfTime nvarchar(10);
--set @MCutOfTime='20211019';
--select a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty , a.Comment1 Final, a.POLocation,a.Comment2,a.LogNo into #TempH from InlineFGPlanLoad a
--	where a.Comment2 in ('New', 'Rev') and a.SchExFactory >= dateadd(day,-4, @MCutOfTime)
--select a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.Comment1 Final,b.CTNLocation POLocation,a.Comment2,a.LogNo  into #TempH from
--(select * from InlineFGPlanLoad) a
--left join InlineFGsWHCTNMaster b on a.PONo = b.PONo
--where a.Comment2 in ('New','Rev') and a.SchExFactory >= dateadd(day,-14,@MCutOfTime) and b.ShipStatus is null and a.InvNo like 'V%'
--group by a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.Comment1,b.CTNLocation,a.Comment2,a.LogNo
--SELECT a.PONo,b.CTNLocation,COUNT(b.CTNSeriNo) Qty--,cast(cast(CTNL as float) * 1000 as varchar) + cast(cast(CTNW as float) * 1000 as varchar) + cast(cast(CTNH as float) * 1000 as varchar) CTNSize
--INTO #ttu
--FROM InlineFGsWHPkList a WITH(NOLOCK)
--	 LEFT JOIN InlineFGsWHCTNMaster b WITH(NOLOCK) ON a.CTNSeriNo = b.CTNSeriNo
--WHERE LEFT(a.PONo,1) <> '4' AND b.ShipStatus IS NULL
--GROUP BY a.PONo,b.CTNLocation,a.CTNL,a.CTNW,CTNH
SELECT
t.PONo,
STUFF((
SELECT DISTINCT ', ' + b2.CTNLocation
FROM InlineFGsWHPkList a2 WITH(NOLOCK)
LEFT JOIN InlineFGsWHCTNMaster b2 WITH(NOLOCK)
ON a2.CTNSeriNo = b2.CTNSeriNo
WHERE LEFT(a2.PONo,1) <> '4'
AND b2.ShipStatus IS NULL
AND a2.PONo = t.PONo
FOR XML PATH(''), TYPE
).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS CTNLocation,
SUM(t.Qty) AS TotalQty
INTO #ttu
FROM (
SELECT
a.PONo,
b.CTNLocation,
COUNT(b.CTNSeriNo) AS Qty
FROM InlineFGsWHPkList a WITH(NOLOCK)
LEFT JOIN InlineFGsWHCTNMaster b WITH(NOLOCK)
ON a.CTNSeriNo = b.CTNSeriNo
WHERE LEFT(a.PONo,1) <> '4'
AND b.ShipStatus IS NULL
GROUP BY a.PONo, b.CTNLocation, a.CTNL, a.CTNW, CTNH
) t
GROUP BY t.PONo
SELECT a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.Comment1 Final,b.CTNLocation POLocation,a.Comment2,a.LogNo--,b.CTNSize
INTO #TempH
FROM  InlineFGPlanLoad a WITH(NOLOCK)
LEFT JOIN #ttu b ON RIGHT(a.PONo,9) = RIGHT(b.PONo,9)
WHERE a.Comment2 IN ('New','Rev') AND a.SchExFactory >= DATEADD(DAY,-30,CAST(@MCutOfTime AS DATE)) AND LEFT(a.InvNo,1) = 'V'
GROUP BY a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.Comment1,b.CTNLocation,a.Comment2,a.LogNo--,b.CTNSize
DROP TABLE #ttu
--#TempHx
SELECT a.* ,ROW_NUMBER() OVER(PARTITION BY a.PONo,a.PkListRef ORDER BY a.RecNo DESC) Rnum
INTO #TempHx
FROM InlineFGsWHFinInsHis a WITH(NOLOCK)
WHERE SysCreateDate > DATEADD(DAY,-180,GETDATE())
--#TempZ
SELECT x.PONo,COUNT(x.CTNBarCode) InCTNQty, x.PlanRefNo,x.Factory
INTO #TempZ
FROM
(
SELECT DISTINCT CASE WHEN n.PONo IS NULL THEN m.PONo ELSE n.PONo END PONo, m.CTNBarCode,n.PlanRefNo,m.Factory
FROM #TempA n
INNER JOIN #TempB m ON m.CTNSeriNo = n.CTNSeriNo
) x
GROUP BY x.PONo,x.PlanRefNo,x.Factory
--#Temp
SELECT a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty , b.InCTNQty, CONVERT(DECIMAL(6,2),b.InCTNQty*100/a.CTNQty) PerClose, a.Final, a.POLocation,a.Comment2,a.LogNo,b.Factory
INTO #Temp
FROM #TempH a
LEFT JOIN #TempZ b ON a.PONo = b.PONo AND a.LogNo = b.PlanRefNo--a.PONo = right(b.PONo,len(a.PONo)) and ltrim(rtrim(replace(replace(a.LogNo,char(13),''),char(10),''))) = ltrim(rtrim(replace(replace(b.PlanRefNo,char(13),''),char(10),'')))
UNION
SELECT *
FROM InlineFGsManualLoad WITH(NOLOCK)
WHERE StyleNo=''
ORDER BY a.SchExFactory DESC
--#TemD
--SELECT CTNLocation,t3.PONo,t3.Factory
--INTO #TemD
--FROM InlineFGsWHCTNMaster t1 WITH(NOLOCK),InlineFGsWHPkList t2 WITH(NOLOCK),#Temp t3
--WHERE ShipStatus IS NULL AND CTNLocation IS NOT NULL AND t1.CTNSeriNo= t2.CTNSeriNo AND RIGHT(t2.PONo,LEN(t3.PONo)) = t3.PONo
IF OBJECT_ID('tempdb..#Base') IS NOT NULL DROP TABLE #Base;
SELECT DISTINCT
t3.PONo,
t3.Factory,
t1.CTNLocation
INTO #Base
FROM InlineFGsWHCTNMaster t1 WITH(NOLOCK)
INNER JOIN InlineFGsWHPkList t2 WITH(NOLOCK)
ON t1.CTNSeriNo = t2.CTNSeriNo
INNER JOIN #Temp t3
ON RIGHT(t2.PONo, LEN(t3.PONo)) = t3.PONo
WHERE
t1.ShipStatus IS NULL
AND t1.CTNLocation IS NOT NULL;
CREATE CLUSTERED INDEX idx_base ON #Base(PONo);
-- B2. N?i chu?i CTNLocation theo PONo
SELECT
b.PONo,
b.Factory,
STUFF((
SELECT ',' + x.CTNLocation
FROM #Base x
WHERE x.PONo = b.PONo
FOR XML PATH(''), TYPE
).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS CTNLocation
INTO #TemD
FROM #Base b
GROUP BY b.PONo, b.Factory
UPDATE #Temp SET POLocation = CTNLocation FROM #Temp t4, #TemD t5 WHERE t4.PONo = t5.PONo
--#TempHy
SELECT bb.PONo,
CASE
WHEN cc.Final = 'F-Ok' THEN 'F-Ok'
WHEN bb.CTNInsResult IS NOT NULL THEN bb.CTNInsResult
WHEN cc.Final = 'NR4Ins' THEN 'N.Thug'
WHEN cc.Final = 'Get' THEN 'L.Finl'
WHEN bb.MisCTN = 'M' THEN 'M'
WHEN bb.MisCTN = '*' THEN 'W.Insp'
ELSE NULL END Final, PkListRef, LotorFull
INTO #TempHy
FROM #TempHx bb
LEFT JOIN #TemC cc ON cc.PONo = bb.PONo--cc.PONo = substring(bb.PONo,len(bb.PONo) - len(cc.PONo) + 1,len(cc.PONo))
--where bb.Rnum=1 and bb.MisCTN in ('M','*')
WHERE bb.Rnum=1 AND (bb.MisCTN IN ('M','*') OR bb.MisCTN IS NULL)
SELECT  a.LogNo,a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty , a.InCTNQty, a.PerClose, c.Final, a.POLocation,a.Comment2,a.Factory
INTO #TempF
FROM #Temp a
LEFT JOIN #TempHy c ON a.PONo = SUBSTRING(c.PONo,LEN(c.PONo) - LEN(a.PONo) + 1,LEN(a.PONo)) AND c.Final IS NOT NULL AND a.LogNo=c.PkListRef
SELECT ff.StyleNo,ff.PONo,ff.Country,ff.OrderQty,ff.SchExFactory,ff.Fowarder,ff.InvNo,ff.CTNQty , ff.InCTNQty, ff.PerClose, ff.Final, ff.POLocation,ff.Comment2,ff.Factory
INTO #tempTu
FROM #TempF ff
LEFT JOIN #TempE xx ON ff.LogNo = xx.LogNo AND LEFT(ff.PONo,9) = LEFT(xx.PONo,9)--SUBSTRING(xx.PONo,LEN(xx.PONo) - LEN(ff.PONo) + 1,LEN(ff.PONo)) --where a.PONo like '%124898891'
--WHERE xx.LogNo IS NULL --and (ff.Factory = @Fac or ff.Factory is null)
GROUP BY ff.StyleNo,ff.PONo,ff.Country,ff.OrderQty,ff.SchExFactory,ff.Fowarder,ff.InvNo,ff.CTNQty , ff.InCTNQty, ff.PerClose, ff.Final, ff.POLocation,ff.Comment2,ff.Factory
ORDER BY ff.SchExFactory DESC
DROP TABLE #TempZ,#Temp,#TempA,#TempB,#TemD,#TempH,#TempHx,#TempHy,#TemC,#TempE,#TempF
SELECT b.PlanRefNo, b.PONo, b.BuyerItem, b.ModelNo, b.CustSize, b.ManuSize, b.GPSSize, b.CTNNo, b.CTNSeriNo, b.PackedQty, b.SysCreateDate, b.CreatedBy, b.Factory, b.RecNo, b.GrssW, b.NetW, b.InsPickCTN, b.InsGetCTN, b.CTNL, b.CTNW, b.CTNH, b.OrderNo, b.N
umberIn
INTO #Temp_PKList
FROM #tempTu a
LEFT JOIN dbo.InlineFGsWHPkList b WITH (NOLOCK) ON RIGHT(a.PONo,9) = RIGHT(b.PONo,9)
WHERE b.CTNL IS NOT NULL
UNION ALL
SELECT P1.PlanRefNo, P1.PONo, P1.BuyerItem, P1.ModelNo, P1.CustSize, P1.ManuSize, P1.GPSSize, P1.CTNNo, P1.CTNSeriNo, P1.PackedQty, P1.SysCreateDate, P1.CreatedBy, P1.Factory, P1.RecNo, P2.GrssW, P2.NetW, P1.InsPickCTN, P1.InsGetCTN, P2.CTNL, P2.CTNW, P2
.CTNH, P1.OrderNo, P1.NumberIn
FROM
(
SELECT b.*
FROM #tempTu a
LEFT JOIN dbo.InlineFGsWHPkList b WITH (NOLOCK) ON RIGHT(a.PONo,9) = RIGHT(b.PONo,9)
) P1
INNER JOIN (
SELECT b.*
FROM #tempTu a
LEFT JOIN dbo.InlineFGsWHPkList b WITH (NOLOCK) ON RIGHT(a.PONo,9) = RIGHT(b.PONo,9)
) P2 ON P1.PONo = P2.PONo AND P2.CTNSeriNo = P1.CTNSeriNo AND P2.CTNL IS NOT NULL
WHERE P1.CTNL IS NULL
SELECT a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory,SUM(CAST(b.CTNL AS FLOAT)*CAST(b.CTNH AS FLOAT)*CAST(b.CTNW AS FLOAT)) CBM,CAST(CAST(ISNULL(b.CTNL,'')
AS FLOAT) * 1000 AS VARCHAR) + CAST(CAST(ISNULL(b.CTNW,'') AS FLOAT) * 1000 AS VARCHAR) + CAST(CAST(ISNULL(b.CTNH,'') AS FLOAT) * 1000 AS VARCHAR) CTNSize
INTO #tempTu1
FROM #tempTu a
LEFT JOIN #Temp_PKList b ON a.PONo = b.PONo --where a.PONo = '0129163353'
GROUP BY a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory,b.CTNL,b.CTNH,b.CTNW;
CREATE CLUSTERED INDEX idx_tempTu1 ON #tempTu1(StyleNo, PONo, Country, OrderQty, SchExFactory, Fowarder, InvNo, CTNQty, InCTNQty, PerClose, POLocation, Comment2, Factory);
SELECT StyleNo,RIGHT(PONo,9) PONo,Country,OrderQty,SchExFactory,Fowarder,InvNo,CTNQty,InCTNQty,PerClose,Final,POLocation,Comment2,Factory,CTNSize,SUM(CBM) CBM
INTO #tempp_
FROM (SELECT DISTINCT a.StyleNo,a.PONo,a.Country,a.OrderQty,CONVERT(VARCHAR(10),a.SchExFactory,120) SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory,a.CBM,
(
SELECT b.CTNSize + ',' AS [text()]
FROM #tempTu1 b WHERE a.StyleNo = b.StyleNo AND a.PONo = b.PONo  AND a.Country = b.Country AND a.OrderQty = b.OrderQty AND a.SchExFactory = b.SchExFactory
AND a.Fowarder = b.Fowarder AND a.InvNo = b.InvNo AND a.CTNQty = b.CTNQty AND a.InCTNQty = b.InCTNQty AND a.PerClose = b.PerClose /*and a.Final = b.Final*/ AND a.POLocation = b.POLocation AND a.Comment2 = b.Comment2 AND a.Factory = b.Factory
ORDER BY a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory
FOR XML PATH('')
) CTNSize
FROM #tempTu1 a) a
GROUP BY StyleNo,RIGHT(PONo,9),Country,OrderQty,SchExFactory,Fowarder,InvNo,CTNQty,InCTNQty,PerClose,Final,POLocation,Comment2,Factory,CTNSize
SELECT DISTINCT RIGHT(PONo,9) PONo,CreatedBy
INTO #Temp_CreatedBy
FROM dbo.InlineFGsWHCTNMaster WITH (NOLOCK)
WHERE RIGHT(PONo,9) IN (SELECT DISTINCT PONo FROM #tempp_)
SELECT DISTINCT a.PONo,
CreatedBy = STUFF((SELECT ',' + CAST(b.CreatedBy AS NVARCHAR(1000))
FROM #Temp_CreatedBy b
WHERE a.PONo = b.PONo
FOR XML PATH (''))
, 1, 1, '')
INTO #Temp_AfterCombine
FROM #Temp_CreatedBy a
SELECT a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory,a.CTNSize,a.CBM,b.CreatedBy
INTO #Temp_F1
FROM #tempp_ a
LEFT JOIN #Temp_AfterCombine b ON b.PONo = a.PONo
;WITH CTE_MaxRecNo AS (
SELECT *,
ROW_NUMBER() OVER (PARTITION BY CTNBarCode ORDER BY RecNo DESC) AS rn
FROM dbo.InlineFGsWHCTNActWght WITH (NOLOCK)
)
SELECT a.PONo,
SUM(b.ActualWght) AS TotalActualWght,
COUNT(DISTINCT a.CTNBarCode) AS TotalCTNBarCode
INTO #Temp_W
FROM (
SELECT DISTINCT b.PONo, b.CTNSeriNo, b.CTNBarCode
FROM #Temp_F1 a
INNER JOIN dbo.InlineFGsWHCTNMaster b WITH (NOLOCK) ON a.PONo = RIGHT(b.PONo, 9)
WHERE b.ReScan IS NULL
) a
LEFT JOIN CTE_MaxRecNo b ON a.CTNBarCode = b.CTNBarCode AND b.rn = 1
GROUP BY a.PONo
ORDER BY a.PONo;
SELECT a.*,CAST(b.TotalActualWght AS NVARCHAR) + '/' + CAST(b.TotalCTNBarCode AS NVARCHAR) WeightCTN
FROM #Temp_F1 a
LEFT JOIN #Temp_W b ON a.PONo = RIGHT(b.PONo,9)
IF OBJECT_ID('AA_PlanLoad_Size') IS NOT NULL
DROP TABLE dbo.AA_PlanLoad_Size
SELECT StyleNo,PONo,Country,OrderQty,SchExFactory,Fowarder,InvNo,CTNQty,InCTNQty,PerClose,Final,POLocation,Comment2,Factory,CBM,CTNSize INTO AA_PlanLoad_Size FROM #tempp_
ALTER TABLE dbo.AA_PlanLoad_Size ADD ShipMode NVARCHAR(50)
UPDATE dbo.AA_PlanLoad_Size SET ShipMode = b.ShipMode FROM dbo.AA_PlanLoad_Size a,dbo.InlineFGPlanLoad b
WHERE b.Comment2 IN ('Rev','New') AND a.PONo = RIGHT(b.PONo,9)
drop table #Temp_F1,#tempTu,#tempTu1,#tempp_,#Temp_CreatedBy,#Temp_AfterCombine
--select z.StyleNo,z.PONo,z.Country,z.OrderQty,z.SchExFactory,z.Fowarder,z.InvNo,z.CTNQty , w.InCTNQty,w.PerClose,w.Final, w.POLocation,z.Comment2,z.LogNo from
--(select a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty , b.InCTNQty, b.InCTNQty*100/a.CTNQty PerClose, Comment1 Final, a.POLocation,a.Comment2,a.LogNo from InlineFGPlanLoad a left join
--	(select PONo, count(CTNNo) InCTNQty from InlineFGsWHCTNMaster where SysCreateDate > dateadd(day,-180,getdate()) group by PONo) b
--	on a.PONo = b.PONo
--	where a.Comment2 in ('New', 'Rev') and SchExFactory >= @MCutOfTime ) z
--left join InlineFGsManualLoad w
--on z.PONo = w.PONo
--union
--select * from InlineFGsManualLoad where StyleNo=''
--order by z.SchExFactory desc
end
else if(@Cust = 'Puma')
begin
--#TempAA
select y.PONo,y.CTNSeriNo,y.PlanRefNo--,cast(cast(CTNL as float) * 1000 as varchar) + cast(cast(CTNW as float) * 1000 as varchar) + cast(cast(CTNH as float) * 1000 as varchar) CTNSize
into #TempAA
from InlineFGsWHPkList y where y.SysCreateDate > dateadd(day,-180,getdate()) and PONo like '4%'
--#TempBB
select p.PONo, p.CTNBarCode, p.CTNSeriNo,p.Factory
into #TempBB
from InlineFGsWHCTNMaster p where SysCreateDate > dateadd(day,-180,getdate()) and ShipStatus is null and PONo like '4%'
--#TempCC
select k.PONo, k.Final, k.Comment1, k.Comment2, k.RecNo into #TemCC from
(
select p.* ,row_number() over(partition by p.PONo order by p.RecNo desc) Rnum from
(
select top 2000 * from InlineFGsWHFinCMT where PONo like '4%' order by RecNo desc
) p
) k
where Rnum = 1 --and k.PONo ='126129044'
--#TempEE
select distinct a.PONo,a.PlanRefNo as LogNo,b.RecNo,b.Factory
into #TempEE
from InlineFGsWHPkList a inner join InlineFGsWHCTNMaster b on a.CTNSeriNo = b.CTNSeriNo
where b.SysCreateDate > dateadd(year,-1,getdate()) and b.ShipStatus is null and (coalesce(b.ShipStatus,'') <> 'del' and coalesce(b.ShipStatus,'') <> 'Rv') and a.PONo like '4%'
--#TempHH drop table #TempH
--declare @MCutOfTime nvarchar(10);
--set @MCutOfTime='20220210';
select a.PONo,b.CTNLocation,count(b.CTNSeriNo) Qty
into #ttuU
from
(select * from InlineFGsWHPkList where PONo like '4%') a
left join InlineFGsWHCTNMaster b on a.CTNSeriNo = b.CTNSeriNo where b.ShipStatus is null group by a.PONo,b.CTNLocation,a.CTNL,a.CTNW,CTNH
select a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.Comment1 Final,b.CTNLocation POLocation,a.Comment2,a.LogNo--,b.CTNSize
into #TempHH
from
(select * from InlineFGPlanLoad where InvNo like 'THKAOP%') a
left join #ttuU b on a.PONo = b.PONo
where a.Comment2 in ('New','Rev') and a.SchExFactory >= dateadd(day,-14,@MCutOfTime)
group by a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.Comment1,b.CTNLocation,a.Comment2,a.LogNo
drop table #ttuU
--#TempHxX
select a.* ,row_number() over(partition by a.PONo,a.PkListRef order by a.RecNo desc) Rnum
into #TempHxX
from (select * from InlineFGsWHFinInsHis where SysCreateDate > dateadd(day,-180,getdate()) and PONo like '4%') a
--#TempZZ
select x.PONo,count(x.CTNBarCode) InCTNQty, x.PlanRefNo,x.Factory
into #TempZZ
from
(
select distinct case when n.PONo is null then m.PONo else n.PONo end PONo, m.CTNBarCode,n.PlanRefNo,m.Factory from
#TempAA n
inner join
#TempBB m
on m.CTNSeriNo = n.CTNSeriNo
) x
group by x.PONo,x.PlanRefNo,x.Factory
--#TempP select * from #Temp	select * from #TempZ
select a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty , b.InCTNQty, CONVERT(DECIMAL(6,2),b.InCTNQty*100/a.CTNQty) PerClose, a.Final, a.POLocation,a.Comment2,a.LogNo,b.Factory
into #TempP
from #TempHH a left join #TempZZ b
on a.PONo = b.PONo --and a.LogNo = b.PlanRefNo--a.PONo = right(b.PONo,len(a.PONo)) and ltrim(rtrim(replace(replace(a.LogNo,char(13),''),char(10),''))) = ltrim(rtrim(replace(replace(b.PlanRefNo,char(13),''),char(10),'')))
union
select * from InlineFGsManualLoad where StyleNo='' order by a.SchExFactory desc
--#TemDD
select CTNLocation,t3.PONo,t3.Factory into #TemDD from InlineFGsWHCTNMaster t1,InlineFGsWHPkList t2,#TempP t3 where ShipStatus is null and CTNLocation is not null and t1.CTNSeriNo= t2.CTNSeriNo and right(t2.PONo,len(t3.PONo)) = t3.PONo
Update #TempP set POLocation = CTNLocation from #TempP t4, #TemDD t5 where t4.PONo = t5.PONo
--#TempHyY
select bb.PONo,
case
when cc.Final = 'F-Ok' then 'F-Ok'
when bb.CTNInsResult is not null then bb.CTNInsResult
when cc.Final = 'NR4Ins' then 'N.Thug'
when cc.Final = 'Get' then 'L.Finl'
when bb.MisCTN = 'M' then 'M'
when bb.MisCTN = '*' then 'W.Insp'
else null end Final, PkListRef, LotorFull
into #TempHyY
from #TempHxX bb
left join #TemCC cc
on cc.PONo = bb.PONo--cc.PONo = substring(bb.PONo,len(bb.PONo) - len(cc.PONo) + 1,len(cc.PONo))
--where bb.Rnum=1 and bb.MisCTN in ('M','*')
where bb.Rnum=1 and (bb.MisCTN in ('M','*') or bb.MisCTN is null)
select  a.LogNo,a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty , a.InCTNQty, a.PerClose, c.Final, a.POLocation,a.Comment2,a.Factory
into #TempFF from
#TempP a
left join
#TempHyY c
on a.PONo = substring(c.PONo,len(c.PONo) - len(a.PONo) + 1,len(a.PONo)) and c.Final is not null and a.LogNo=c.PkListRef
select ff.StyleNo,ff.PONo,ff.Country,ff.OrderQty,ff.SchExFactory,ff.Fowarder,ff.InvNo,ff.CTNQty , ff.InCTNQty, ff.PerClose, ff.Final, ff.POLocation,ff.Comment2,ff.Factory
into #tempTuU
from
#TempFF ff left join #TempEE xx
on ff.LogNo = xx.LogNo and ff.PONo = substring(xx.PONo,len(xx.PONo) - len(ff.PONo) + 1,len(ff.PONo)) --where a.PONo like '%124898891'
where xx.LogNo is null --and (ff.Factory = @Fac or ff.Factory is null)
group by ff.StyleNo,ff.PONo,ff.Country,ff.OrderQty,ff.SchExFactory,ff.Fowarder,ff.InvNo,ff.CTNQty , ff.InCTNQty, ff.PerClose, ff.Final, ff.POLocation,ff.Comment2,ff.Factory
order by ff.SchExFactory desc
drop table #TempZZ,#TempP,#TempAA,#TempBB,#TemDD,#TempHH,#TempHxX,#TempHyY,#TemCC,#TempEE,#TempFF
select a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory,sum(cast(b.CTNL as float)*cast(b.CTNH as float)*cast(b.CTNW as float)) CBM,cast(cast(b.CTNL as float)
* 1000 as varchar) + cast(cast(b.CTNW as float) * 1000 as varchar) + cast(cast(b.CTNH as float) * 1000 as varchar) CTNSize
into #tempTu11
from #tempTuU a
left join InlineFGsWHPkList b on a.PONo = b.PONo --where a.PONo = '0129163353'
group by a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory,b.CTNL,b.CTNH,b.CTNW
select distinct a.StyleNo,a.PONo,a.Country,a.OrderQty,convert(date,a.SchExFactory) SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory,a.CBM,
(
select b.CTNSize + ',' as [text()]
from #tempTu11 b where a.StyleNo = b.StyleNo and a.PONo = b.PONo  and a.Country = b.Country and a.OrderQty = b.OrderQty and a.SchExFactory = b.SchExFactory
and a.Fowarder = b.Fowarder and a.InvNo = b.InvNo and a.CTNQty = b.CTNQty and a.InCTNQty = b.InCTNQty and a.PerClose = b.PerClose /*and a.Final = b.Final*/ and a.POLocation = b.POLocation and a.Comment2 = b.Comment2 and a.Factory = b.Factory
order by a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty,a.InCTNQty,a.PerClose,a.Final,a.POLocation,a.Comment2,a.Factory
for xml path('')
) CTNSize
from #tempTu11 a
drop table #tempTuU,#tempTu11
--select z.StyleNo,z.PONo,z.Country,z.OrderQty,z.SchExFactory,z.Fowarder,z.InvNo,z.CTNQty , w.InCTNQty,w.PerClose,w.Final, w.POLocation,z.Comment2,z.LogNo from
--(select a.StyleNo,a.PONo,a.Country,a.OrderQty,a.SchExFactory,a.Fowarder,a.InvNo,a.CTNQty , b.InCTNQty, b.InCTNQty*100/a.CTNQty PerClose, Comment1 Final, a.POLocation,a.Comment2,a.LogNo from InlineFGPlanLoad a left join
--	(select PONo, count(CTNNo) InCTNQty from InlineFGsWHCTNMaster where SysCreateDate > dateadd(day,-180,getdate()) group by PONo) b
--	on a.PONo = b.PONo
--	where a.Comment2 in ('New', 'Rev') and SchExFactory >= @MCutOfTime ) z
--left join InlineFGsManualLoad w
--on z.PONo = w.PONo
--union
--select * from InlineFGsManualLoad where StyleNo=''
--order by z.SchExFactory desc
end
end