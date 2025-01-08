using Microsoft.SemanticKernel;
using System.ComponentModel;

namespace ChatCompletion.Plugins;

/// <summary>
/// タイトルの生成プラグイン
/// </summary>
public class GenerateTitlePlugin
{
    [KernelFunction]
    [Description("要約したテキストを受け取ります（２０文字以内）")]
    public string PutTitle([Description("要約したテキスト")] string text)
    {
        return text;
    }
}
