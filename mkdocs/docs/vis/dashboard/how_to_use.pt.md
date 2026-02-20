# Como Usar

O dashboard foi criado para permitir a comparação entre os modelos registrados na plataforma. Esta seção explica em detalhes cada um de seus componentes e como eles podem ser usados.

## Geral ou Sprint IMDC

Na barra lateral do dashboard, existe uma opção para exibir ou não as predições para a **Sprint IMDC**. Quando as opções de IMDC são selecionadas, o dashboard exibirá apenas as previsões relacionadas às Sprints, ou seja, previsões de dengue em nível estadual. Para mais detalhes sobre as Sprints do IMDC, consulte [esta página](https://sprint.mosqlimate.org/). Esta distinção foi feita porque a Sprint utiliza apenas dados de **casos prováveis**.

## Selecionando a Doença e as Opções Espaciais

O primeiro passo ao abrir o dashboard é selecionar a **doença** e as **opções espaciais** das previsões que você deseja visualizar. Se a opção **Sprint IMDC** estiver ativada, opções específicas serão mostradas, permitindo **apenas a seleção do estado** para o qual você deseja visualizar as previsões — isso ocorre porque a Sprint fornece apenas previsões de dengue em nível estadual.

Se a opção **Sprint IMDC estiver desativada**, os filtros abaixo podem ser usados. Na aba **estadual**, os filtros serão semelhantes aos da Sprint e exibirão apenas previsões em nível de estado. Na aba **municipal**, você pode selecionar um município específico e visualizar as previsões disponíveis para ele. Em ambas as abas, você pode filtrar as **doenças** disponíveis a partir dos Modelos enviados.

Por padrão, em ambos os casos, o dashboard pré-seleciona uma **doença** e uma opção **espacial**. Sempre que esses parâmetros são alterados, os **modelos** e as **previsões** disponíveis na caixa de seleção abaixo do gráfico também são atualizados.

Falaremos mais sobre esses elementos na próxima seção.

## Modelos

Por padrão, todos os modelos disponíveis para a doença e o nível espacial selecionados serão exibidos.

![models](/docs/images/dashboard/models_pt.png)

Para visualizar mais informações sobre um modelo, clique em **seu nome** na lista de predições e você será direcionado para a página do modelo.

![model page](/docs/images/dashboard/page_model_example_en.png)

Para visualizar as previsões de **apenas um modelo**, basta clicar sobre ele. Após clicar, o modelo será destacado com uma cor mais escura, e apenas as **previsões geradas por ele** serão mostradas na caixa de previsões do dashboard. **Mais de um modelo pode ser selecionado ao mesmo tempo.**


## Previsões

A **caixa de previsões** exibe todas as previsões disponíveis com base nos filtros aplicados. Para **plotar todas simultaneamente**, clique na caixa de seleção destacada abaixo. Para **selecionar uma previsão** ou **remover uma seleção**, clique na caixa de seleção ao lado do **ID** da previsão correspondente. As cores na tabela de previsões correspondem às utilizadas no gráfico.

![prediction select](/docs/images/dashboard/pred_selection_pt.png)

A tabela de previsões contém as seguintes informações:

* `ID` – Identificador interno associado à previsão;
* `Model Owner` – Identificador do usuário ou organização do repositório do modelo usado para gerar a previsão;
* `Model Name` – Identificador do nome do repositório do modelo. É clicável e leva à página do modelo;
* `Start Date` – Primeira data prevista pela previsão;
* `End Date` – Última data prevista pela previsão;
* `Interval Bounds` – Alterna os limites de intervalo do modelo, mostra os limites de 50 e 90% da previsão;
* `Scores` – Estas colunas representam os valores de uma métrica comparando a previsão com os dados observados. (As métricas disponíveis são: CRPS, MAE, MSE, Log Score e WIS). Para mais informações sobre o que cada uma significa e como são calculadas, verifique [scores](vis/dashboard/scores.en.md).

As previsões podem ser ordenadas em ordem crescente ou decrescente com base nessas colunas. Basta clicar no nome da coluna.

## Gráfico de Previsão

Quando uma previsão é selecionada, ela é exibida no gráfico:

![prediction 1](/docs/images/dashboard/prev_1.png)

Além disso, você pode ajustar o intervalo de datas exibido usando a roda do mouse ou clicando e arrastando uma das extremidades da barra de seleção para o intervalo desejado.

![scroll](/docs/images/dashboard/scroll_date.png)
