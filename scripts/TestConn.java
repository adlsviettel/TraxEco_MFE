import java.net.Socket;
public class TestConn {
    public static void main(String[] args) {
        try {
            long start = System.currentTimeMillis();
            Socket s = new Socket("172.18.99.41", 1433);
            System.out.println("Connected in " + (System.currentTimeMillis() - start) + "ms");
            s.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
