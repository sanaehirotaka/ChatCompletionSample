using Microsoft.SemanticKernel;
using System.ComponentModel;

namespace ChatCompletion.Plugins;

/// <summary>
/// タイトルの生成プラグイン
/// </summary>
public class GenerateTitlePlugin
{
    public string? Title { get; set; }

    [KernelFunction]
    [Description("要約したテキストを受け取ります")]
    public string PutTitle([Description("要約したテキスト")] string text)
    {
        return Title = text;
    }
}
