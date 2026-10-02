using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace PharmacyPOS
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            try
            {
                string dir = AppDomain.CurrentDomain.BaseDirectory;
                string htmlFile = Path.Combine(dir, "نظام_الكاشير_والمخازن_محمود_حمدي_بصري.html");
                if (!File.Exists(htmlFile))
                {
                    htmlFile = Path.Combine(dir, "index.html");
                }

                // 1. Try launching Edge in dedicated App Mode
                ProcessStartInfo psiEdge = new ProcessStartInfo
                {
                    FileName = "msedge.exe",
                    Arguments = "--app=\"" + htmlFile + "\" --window-size=1366,768 --start-maximized",
                    UseShellExecute = true
                };

                try
                {
                    Process.Start(psiEdge);
                    return;
                }
                catch { }

                // 2. Try launching Chrome in dedicated App Mode
                ProcessStartInfo psiChrome = new ProcessStartInfo
                {
                    FileName = "chrome.exe",
                    Arguments = "--app=\"" + htmlFile + "\" --window-size=1366,768 --start-maximized",
                    UseShellExecute = true
                };

                try
                {
                    Process.Start(psiChrome);
                    return;
                }
                catch { }

                // 3. Fallback to default browser
                Process.Start(htmlFile);
            }
            catch (Exception ex)
            {
                MessageBox.Show("خطأ أثناء تشغيل البرنامج: " + ex.Message, "نظام كاشير الصيدلية", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
